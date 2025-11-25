import { SQL } from '../../src/SQL'

const db = new SQL({ type: 'sqlite', url: ':memory:' })

await db.createTable('items', {
	id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
	name: 'TEXT',
	category: 'TEXT',
})

await db.insert('items', { name: 'Item 1', category: 'A' })
await db.insert('items', { name: 'Item 2', category: 'A' })
await db.insert('items', { name: 'Item 3', category: 'B' })
await db.insert('items', { name: 'Item 4', category: 'B' })
await db.insert('items', { name: 'Item 5', category: 'C' })

// Count all items
const totalItems = await db.count({ tableName: 'items' })
console.log(`Total items: ${totalItems}`) // Expected: 5

// Count items in category A
const categoryAItems = await db.count({
	tableName: 'items',
	whereClause: { category: 'A' },
})
console.log(`Items in category A: ${categoryAItems}`) // Expected: 2

// Count items in category B
const categoryBItems = await db.count({
	tableName: 'items',
	whereClause: { category: 'B' },
})
console.log(`Items in category B: ${categoryBItems}`) // Expected: 2
