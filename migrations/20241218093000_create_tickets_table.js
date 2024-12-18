exports.up = async function(knex) {
  await knex.schema.createTable('tickets', (table) => {
    table.increments('id').primary();
    table.integer('count').notNullable();
  });

  // Insert a default entry for the tickets
  await knex('tickets').insert({ count: 100 }); // Assume starting with 100 tickets
};

exports.down = async function(knex) {
  await knex.schema.dropTable('tickets');
};