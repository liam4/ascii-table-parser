'use strict'

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}

module.exports = function handle(contents, rules) {
  const tables = contents.split(rules.tableSplit)
  const out = []
  for (let table of tables) {
    // Extract data
    const data = {}
    for (const dataName in rules.getData) {
      const dataMatcher = rules.getData[dataName]
      const lines = table.split('\n')

      const handleOneLine = testString => {
        const re = new RegExp(dataMatcher.regex)
        const matches = testString.match(re)
        let match
        if (matches === null) {
          // handle null
          match = '((Failed to match anything))'
        } else {
          match = matches['group' in dataMatcher ? dataMatcher.group : 0]
        }
        // console.log('TEST:', testString)
        // console.log('REGEX:', re)
        // console.log('MATCH:', match)
        return match
      }

      if ('lines' in dataMatcher) {
        const l = dataMatcher.lines
        if ('begin' in l && 'end' in l) {
          let begin
          let end
          if (isNumber(l.begin)) {
            begin = l.begin - 1
          } else {
            const re = new RegExp(l.begin)
            for (let i = 0; i < lines.length; i++) {
              if (re.test(lines[i])) {
                begin = i
                break
              }
            }
          }
          if (isNumber(l.end)) {
            end = l.end - 1
          } else {
            const re = new RegExp(l.end)
            let i
            if (l.startCanBeEnd) {
              i = begin
            } else {
              i = begin + 1
            }
            for (; i < lines.length; i++) {
              if (re.test(lines[i])) {
                end = i
                break
              }
            }
          }
          if ('inclusive' in l && l.inclusive === false) {
            begin += 1
            end -= 1
          }
          const testStrings = lines.slice(begin, end + 1)
          const results = testStrings.map(handleOneLine)
          const join = ('join' in l) ? l.join : ' '
          data[dataName] = results.join(join)
        }
      } else {
        let testString
        if ('line' in dataMatcher) {
          testString = lines[dataMatcher.line - 1]
        } else {
          testString = lines
        }
        data[dataName] = handleOneLine(testString)
      }
    }

    // console.log('----')
    // console.log('DATA:', data)

    // Template template template!
    const template = rules.template
    out.push(template
      .replace(/\$\(([^)]+)\)/g, function(_, dataName) {
        return data[dataName]
      }))
  }
  return {templated: out}
}
