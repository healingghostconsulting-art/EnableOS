export type SearchableTrainingRecord = {
  title: string;
  subtitle?: string;
  keywords?: string[];
};

function normalizeTrainingText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchesTrainingSearch(record: SearchableTrainingRecord, query: string) {
  const normalizedQuery = normalizeTrainingText(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeTrainingText([
    record.title,
    record.subtitle ?? "",
    ...(record.keywords ?? []),
  ].join(" "));

  return normalizedQuery
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function filterTrainingRecords<T extends SearchableTrainingRecord>(records: T[], query: string) {
  return records.filter((record) => matchesTrainingSearch(record, query));
}
