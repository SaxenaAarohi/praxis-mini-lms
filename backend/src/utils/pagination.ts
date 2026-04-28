export interface PageQuery {
  page?: string | number;
  limit?: string | number;
}

export interface PageInfo {
  page: number;
  limit: number;
  skip: number;
}

export function parsePaging(query: PageQuery, defaults = { page: 1, limit: 20, max: 100 }): PageInfo {
  const page = Math.max(1, Number(query.page ?? defaults.page) || defaults.page);
  const requestedLimit = Number(query.limit ?? defaults.limit) || defaults.limit;
  const limit = Math.min(Math.max(1, requestedLimit), defaults.max);
  return { page, limit, skip: (page - 1) * limit };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function paginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
