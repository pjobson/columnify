"use strict"

var utils = require('./utils')
var padRight = utils.padRight
var splitIntoLines = utils.splitIntoLines
var splitLongWords = utils.splitLongWords

module.exports = function(items, options) {

  // defaults
  options = options || Object.create(null)
  var defaultColumn = options.defaultColumn || {
    maxWidth: Infinity,
    minWidth: 0
  }

  defaultColumn.maxWidth = defaultColumn.maxWidth || Infinity
  defaultColumn.minWidth = defaultColumn.minWidth || 0
  options.columnSplitter = options.columnSplitter || ' '

  if (typeof options.truncate !== 'string') {
    options.truncate = options.truncate ? '…' : false
  }
  var truncationChar = options.truncate || '…'

  options.spacing = options.spacing || '\n'

  options.widths = options.widths || Object.create(null)

  var columnNames = options.columns || []

  // if not suppled column names, automatically determine columns from data
  if (!columnNames.length) {
    items.forEach(function(item) {
      for (var columnName in item) {
        if (columnNames.indexOf(columnName) === -1) columnNames.push(columnName)
      }
    })
  }

  // initialize each column
  var columns = columnNames.reduce(function(columns, columnName) {
    columns[columnName] = {}
    return columns
  }, Object.create(null))

  // set column defaults
  columnNames.forEach(function(columnName) {
    var column = columns[columnName]
    var width = options.widths[columnName] || defaultColumn
    column.maxWidth = width.maxWidth || defaultColumn.maxWidth || Infinity
    column.minWidth = width.minWidth || defaultColumn.minWidth || 0
  })

  // sanitize data
  items = items.map(function(item) {
    var result = Object.create(null)
    columnNames.forEach(function(columnName) {
      // null/undefined -> ''
      result[columnName] = item[columnName] != null ? item[columnName] : ''
      // toString everything
      result[columnName] = '' + result[columnName]
      // remove funky chars
      result[columnName] = result[columnName].replace(/\s+/g, " ")
    })
    return result
  })

  // add headers
  var headers = {}
  columnNames.forEach(function(columnName) {
    headers[columnName] = columnName.toUpperCase()
  })
  items.unshift(headers)

  // get actual max-width between min & max
  // based on length of data in columns
  columnNames.forEach(function(columnName) {
    var column = columns[columnName]
    column.width = items.map(function(item) {
      return item[columnName]
    }).reduce(function(min, cur) {
      return Math.max(min, Math.min(column.maxWidth, Math.max(column.minWidth, cur.length)))
    }, 0)
  })

  // split long words
  columnNames.forEach(function(columnName) {
    var column = columns[columnName]
    items = items.map(function(item) {
      item[columnName] = splitLongWords(item[columnName], column.width, truncationChar)
      return item
    })
  })

  // wrap long lines
  columnNames.forEach(function(columnName) {
    var column = columns[columnName]
    items = items.map(function(item) {
      var cell = item[columnName]
      item[columnName] = splitIntoLines(cell, column.width)

      // if truncating required, only include first line + add truncation char
      if (options.truncate && item[columnName].length > 1) {
          item[columnName] = splitIntoLines(cell, column.width - truncationChar.length)
          if (item[columnName][0].slice(-truncationChar.length) != truncationChar) item[columnName][0] += truncationChar
          item[columnName] = item[columnName].slice(0, 1)
      }
      return item
    })
  })

  // recalculate column widths from truncated output
  columnNames.forEach(function(columnName) {
    var column = columns[columnName]
    column.width = items.map(function(item) {
      return item[columnName].reduce(function(min, cur) {
        return Math.max(min, Math.min(column.maxWidth, Math.max(column.minWidth, cur.length)))
      }, 0)
    }).reduce(function(min, cur) {
      return Math.max(min, Math.min(column.maxWidth, Math.max(column.minWidth, cur)))
    }, 0)
  })

  var rows = createRows(items, columns, columnNames)

  // conceive output
  return rows.reduce(function(output, row) {
    return output.concat(row.reduce(function(rowOut, line) {
      return rowOut.concat(line.join(options.columnSplitter))
    }, []))
  }, []).join(options.spacing)
}

/**
 * Convert wrapped lines into rows with padded values.
 *
 * @param Array items data to process
 * @param Array columns column width settings for wrapping
 * @param Array columnNames column ordering
 * @return Array items wrapped in arrays, corresponding to lines
 */

function createRows(items, columns, columnNames) {
  return items.map(function(item) {
    var row = []
    var numLines = 0
    columnNames.forEach(function(columnName) {
      numLines = Math.max(numLines, item[columnName].length)
    })
    // combine matching lines of each rows
    for (var i = 0; i < numLines; i++) {
      row[i] = row[i] || []
      columnNames.forEach(function(columnName) {
        var column = columns[columnName]
        var val = item[columnName][i] || '' // || '' ensures empty columns get padded
        row[i].push(padRight(val, column.width))
      })
    }
    return row
  })
}
