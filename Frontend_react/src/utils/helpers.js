export function standardizeKabupatenName(name) {
  if (!name) return ''
  return name.toLowerCase().trim()
      .replace(/kab\.\s/g, 'kab ')
      .replace(/\s+/g, ' ')
}

export function toTitleCase(str) {
  if (!str) return ''
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}