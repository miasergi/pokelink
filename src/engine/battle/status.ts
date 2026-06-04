import type { StatusCondition } from '@/types'

export const STATUS_LABEL: Record<StatusCondition, string> = {
  none: '',
  brn: 'Quemadura',
  psn: 'Veneno',
  par: 'Parálisis',
  slp: 'Sueño',
  frz: 'Congelación',
  tox: 'Veneno grave',
}

export const STATUS_SHORT: Record<StatusCondition, string> = {
  none: '',
  brn: 'QUEM',
  psn: 'VEN',
  par: 'PAR',
  slp: 'DOR',
  frz: 'CONG',
  tox: 'TOX',
}

export const STATUS_COLOR: Record<StatusCondition, string> = {
  none: '',
  brn: '#f08030',
  psn: '#a040a0',
  par: '#f8d030',
  slp: '#8a8a8a',
  frz: '#98d8d8',
  tox: '#a040a0',
}
