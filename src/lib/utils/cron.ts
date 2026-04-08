export type CronFieldName = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

export interface CronFieldState {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

type FieldRule = {
  label: string;
  min: number;
  max: number;
  allowSundaySeven?: boolean;
};

const FIELD_RULES: Record<CronFieldName, FieldRule> = {
  minute: { label: 'minute', min: 0, max: 59 },
  hour: { label: 'hour', min: 0, max: 23 },
  dayOfMonth: { label: 'day of month', min: 1, max: 31 },
  month: { label: 'month', min: 1, max: 12 },
  dayOfWeek: { label: 'day of week', min: 0, max: 6, allowSundaySeven: true }
};

const FIELD_ORDER: CronFieldName[] = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export class CronError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CronError';
  }
}

function fail(message: string): never {
  throw new CronError(message);
}

function isIntegerString(value: string): boolean {
  return /^-?\d+$/.test(value.trim());
}

function normalizeDayOfWeekValue(value: number): number {
  return value === 7 ? 0 : value;
}

function normalizeValue(field: CronFieldName, value: number): number {
  if (field === 'dayOfWeek') {
    return normalizeDayOfWeekValue(value);
  }

  return value;
}

function parseToken(field: CronFieldName, token: string, values: Set<number>): void {
  const rule = FIELD_RULES[field];
  const [baseToken, stepToken] = token.split('/');

  if (token.split('/').length > 2) {
    fail(`Invalid ${rule.label} token: ${token}`);
  }

  const step = stepToken === undefined ? 1 : Number(stepToken);
  if (!Number.isInteger(step) || step <= 0) {
    fail(`Invalid step in ${rule.label}: ${token}`);
  }

  let rangeStart = rule.min;
  let rangeEnd = rule.max;

  if (baseToken !== '*') {
    if (baseToken.includes('-')) {
      const parts = baseToken.split('-');
      if (parts.length !== 2 || parts.some((part) => part.trim().length === 0)) {
        fail(`Invalid range in ${rule.label}: ${token}`);
      }

      const start = Number(parts[0]);
      const end = Number(parts[1]);
      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        fail(`Invalid range in ${rule.label}: ${token}`);
      }

      rangeStart = normalizeValue(field, start);
      rangeEnd = normalizeValue(field, end);
    } else {
      if (!isIntegerString(baseToken)) {
        fail(`Invalid value in ${rule.label}: ${token}`);
      }

      const value = normalizeValue(field, Number(baseToken));
      rangeStart = value;
      rangeEnd = value;
    }
  }

  if (field === 'dayOfWeek' && stepToken === undefined && baseToken !== '*' && Number(baseToken) === 7) {
    rangeStart = 0;
    rangeEnd = 0;
  }

  if (rangeStart < rule.min || rangeEnd > rule.max || rangeStart > rangeEnd) {
    fail(`Value out of range in ${rule.label}: ${token}`);
  }

  for (let value = rangeStart; value <= rangeEnd; value += step) {
    values.add(value);
  }
}

export function parseCronField(field: CronFieldName, input: string): number[] {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    fail(`The ${FIELD_RULES[field].label} field is required.`);
  }

  if (trimmed === '*') {
    const { min, max } = FIELD_RULES[field];
    return Array.from({ length: max - min + 1 }, (_, index) => index + min);
  }

  const values = new Set<number>();
  for (const token of trimmed.split(',')) {
    const cleaned = token.trim();
    if (cleaned.length === 0) {
      fail(`Invalid ${FIELD_RULES[field].label} token.`);
    }

    parseToken(field, cleaned, values);
  }

  if (values.size === 0) {
    fail(`The ${FIELD_RULES[field].label} field has no valid values.`);
  }

  return Array.from(values).sort((left, right) => left - right);
}

export function parseCronExpression(expression: string): CronFieldState {
  const parts = expression.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    fail('Cron expressions must contain exactly 5 fields: minute hour day-of-month month day-of-week.');
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4]
  };
}

export function buildCronExpression(fields: CronFieldState): string {
  return FIELD_ORDER.map((field) => fields[field].trim()).join(' ');
}

export function validateCronExpression(expression: string): CronFieldState {
  const fields = parseCronExpression(expression);
  FIELD_ORDER.forEach((field) => parseCronField(field, fields[field]));
  return fields;
}

function canonicalizeField(field: CronFieldName, expression: string): string {
  const values = parseCronField(field, expression);
  const rule = FIELD_RULES[field];

  if (values.length === rule.max - rule.min + 1 && values[0] === rule.min && values[values.length - 1] === rule.max) {
    return '*';
  }

  return values.join(',');
}

export function canonicalizeCronExpression(expression: string): CronFieldState {
  const parsed = validateCronExpression(expression);

  return {
    minute: canonicalizeField('minute', parsed.minute),
    hour: canonicalizeField('hour', parsed.hour),
    dayOfMonth: canonicalizeField('dayOfMonth', parsed.dayOfMonth),
    month: canonicalizeField('month', parsed.month),
    dayOfWeek: canonicalizeField('dayOfWeek', parsed.dayOfWeek)
  };
}

function describeField(field: CronFieldName, expression: string): string {
  const values = parseCronField(field, expression);

  if (expression.trim() === '*') {
    return 'every value';
  }

  if (/^\*\/\d+$/.test(expression.trim())) {
    const step = expression.trim().slice(2);
    return `every ${step}`;
  }

  if (values.length === 1) {
    if (field === 'dayOfWeek') {
      return DAY_NAMES[values[0]];
    }

    if (field === 'month') {
      return MONTH_NAMES[values[0] - 1];
    }

    return `${values[0]}`;
  }

  if (field === 'dayOfWeek') {
    return values.map((value) => DAY_NAMES[value]).join(', ');
  }

  if (field === 'month') {
    return values.map((value) => MONTH_NAMES[value - 1]).join(', ');
  }

  return values.join(', ');
}

export function describeCronExpression(expression: string): string {
  const fields = validateCronExpression(expression);
  const minute = fields.minute.trim();
  const hour = fields.hour.trim();
  const dayOfMonth = fields.dayOfMonth.trim();
  const month = fields.month.trim();
  const dayOfWeek = fields.dayOfWeek.trim();

  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }

  if (minute === '*/5' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every 5 minutes';
  }

  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Hourly';
  }

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Daily at 00:00';
  }

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '1') {
    return 'Weekly on Mondays at 00:00';
  }

  if (minute === '0' && hour === '0' && dayOfMonth === '1' && month === '*' && dayOfWeek === '*') {
    return 'Monthly on the 1st at 00:00';
  }

  const minuteDescription = describeField('minute', minute);
  const hourDescription = describeField('hour', hour);
  const dayDescription = describeField('dayOfMonth', dayOfMonth);
  const monthDescription = describeField('month', month);
  const weekdayDescription = describeField('dayOfWeek', dayOfWeek);

  return `Runs at minute ${minuteDescription}, hour ${hourDescription}, day ${dayDescription}, month ${monthDescription}, weekday ${weekdayDescription}.`;
}

function dateMatchesCron(fields: CronFieldState, date: Date): boolean {
  const minuteValues = parseCronField('minute', fields.minute);
  const hourValues = parseCronField('hour', fields.hour);
  const dayOfMonthValues = parseCronField('dayOfMonth', fields.dayOfMonth);
  const monthValues = parseCronField('month', fields.month);
  const dayOfWeekValues = parseCronField('dayOfWeek', fields.dayOfWeek);

  const monthMatch = monthValues.includes(date.getMonth() + 1);
  const hourMatch = hourValues.includes(date.getHours());
  const minuteMatch = minuteValues.includes(date.getMinutes());

  const domWildcard = fields.dayOfMonth.trim() === '*';
  const dowWildcard = fields.dayOfWeek.trim() === '*';
  const domMatch = dayOfMonthValues.includes(date.getDate());
  const dowMatch = dayOfWeekValues.includes(date.getDay());
  const dayMatch = domWildcard && dowWildcard ? true : domWildcard ? dowMatch : dowWildcard ? domMatch : domMatch || dowMatch;

  return monthMatch && hourMatch && minuteMatch && dayMatch;
}

export function getNextCronExecutions(expression: string, from = new Date(), count = 10): Date[] {
  const fields = validateCronExpression(expression);
  const results: Date[] = [];
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const maxIterations = 60 * 24 * 366;
  for (let iteration = 0; iteration < maxIterations && results.length < count; iteration += 1) {
    if (dateMatchesCron(fields, cursor)) {
      results.push(new Date(cursor.getTime()));
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  if (results.length < count) {
    fail('Unable to find enough future run times for this expression within the next year.');
  }

  return results;
}
