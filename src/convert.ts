#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'yaml'

interface Attack {
  attack?: string
  vs?: string
  damage?: string
  critical?: string
}

interface Power {
  template: string
  name: string
  type: 'at-will'
  level?: string
  keywords?: string[]
  action: 'standard'
  range?: string
  target?: string
  special?: string
  trigger?: string
  effect?: string
  attacks?: Attack[]
}

const TYPES = {
  'at-will': 'atwill',
  encounter: 'encounter',
  daily: 'daily',
}
const ACTIONS = {
  free: 'Free',
  minor: 'Minor',
  standard: 'Standard',
  'imm-interrupt': 'Imm Interrupt',
  'imm-reaction': 'Imm Reaction',
  move: 'Move',
}

const ATTACK_MODS: { [key: number]: string } = {
  0: '',
  1: 'secondary',
  2: 'tertiary',
}

async function read(path: string): Promise<Power> {
  const file = await fs.readFile(path, 'utf8')
  return parse(file)
}

async function write(path: string, segments: string[]) {
  await fs.writeFile(path, segments.join(' '))
}

function formatAttacks(attacks: Attack[] = []) {
  return attacks.map((attack, i) => {
    const mod = ATTACK_MODS[i]

    return [
      attack.attack?.length
        ? `{{${mod}attack=${attack.attack} vs **${attack.vs}**}}`
        : '',
      attack.damage?.length ? `{{${mod}damage=${attack.damage} damage}}` : '',
      attack.critical?.length
        ? `{{${mod}critical=${attack.critical} damage}}`
        : '',
    ].join(' ')
  })
}
function createRoll20Segments(power: Power) {
  const attacks = formatAttacks(power.attacks)
  const segments = [
    `&{template:${power.template.replace(/-/g, '')}}`,
    `{{${TYPES[power.type]}=1}}`,
    `{{name=${power.name}}}`,
    power.level?.length ? `{{level=${power.level}}}` : '',
    power.keywords?.length ? `{{keywords=${power.keywords.join(', ')}}}` : '',
    ACTIONS[power.action] ? `{{action=${ACTIONS[power.action]} ♦}}` : '',
    power.range?.length ? `{{range=${power.range}}}` : '',
    power.target?.length ? `{{target=${power.target}}}` : '',

    power.special?.length ? `{{special=${power.special}}}` : '',
    power.trigger?.length ? `{{trigger=${power.trigger}}}` : '',
    power.effect?.length ? `{{effect=${power.effect}}}` : '',

    ...attacks,
  ]

  return segments
}

async function convert(fileIn: string) {
  const fileOutName = path.basename(fileIn).replace('.yml', '.roll20')
  const fileOut = `./${path
    .dirname(fileIn)
    .replace('abilities', 'generated')}/${fileOutName}`

  console.log(`Converting ${fileIn} to Roll 20 syntax - ${fileOut}`)

  console.log('Reading file')

  const data = await read(fileIn)

  console.log('Creating Roll 20 segments...')
  const segments = createRoll20Segments(data)

  fs.mkdir(path.dirname(fileOut), { recursive: true })

  console.log('Writing file...')
  await write(fileOut, segments)
}

async function convertAllInDirectory(dir = '') {
  const files = (await fs.readdir(dir)).filter(
    (f) => path.extname(f) === '.yml',
  )

  for (const file of files) await convert(path.join(dir, file))
}

convertAllInDirectory('./abilities/AEkorne')
