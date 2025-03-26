import fs from 'fs'

function getValueFromPath(obj: any, path: string): any {
  const keys = path.split('.')
  let value = obj
  for (const key of keys) {
    if (value[key] === undefined || value[key] === null) return ''
    value = value[key]
  }
  return value
}

interface Data {
  [key: string]: any
}


export function ViewTemplates(templateFilePath: string, data: Data): string {
  let templateContent = fs.readFileSync(templateFilePath, 'utf8')
  templateContent = templateContent.replace(/{{#each\s+([\w.]+)}}([\s\S]*?){{\/each}}/g, (match, arrayPath, blockContent) => {
    const items = getValueFromPath(data, arrayPath)
    if (!Array.isArray(items)) return ''
    return items.map(item => {
      return blockContent.replace(/{{this\.(.*?)}}/g, (_, thisPath) => {
        return String(getValueFromPath(item, thisPath))
      })
    }).join('')
  })
  return templateContent.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, p1) => {
    return String(getValueFromPath(data, p1))
  })
}