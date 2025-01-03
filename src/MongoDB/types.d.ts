export type TypeMongoDBdatabaseConnection = {
	connectionString: string
	database: string
}

export type TypeMongoQueryPagination = {
	page?: number
	limit?: number
	sort?: Record<string, 1 | -1>
	opts?: object
}
