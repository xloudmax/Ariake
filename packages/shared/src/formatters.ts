export const formatDate = (date: string | number | Date, locale: string = 'en') => {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export const formatNumber = (value: number, locale: string = 'en') => {
  return new Intl.NumberFormat(locale).format(value)
}

export const formatPercent = (value: number, locale: string = 'en') => {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(value)
}
