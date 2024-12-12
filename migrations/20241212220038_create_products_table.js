/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('products', (table) => {
    table.increments('id').primary(); // Auto-incrementing primary key
    table.string('title').notNullable().unique(); // Title column
    table.text('description').notNullable(); // Description column
    table.decimal('cost', 10, 2).notNullable(); // Cost column with precision
    table.timestamps(true, true); // Adds created_at and updated_at timestamps
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('products');
};
