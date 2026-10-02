const { Client } = require('pg');

const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.wquicdlbtbcsivyqdltx',
  password: 'kaberayuub7',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await c.connect();

  // Get all tables and columns
  const cols = await c.query(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
           character_maximum_length, numeric_precision
    FROM information_schema.columns 
    WHERE table_schema='public' 
    ORDER BY table_name, ordinal_position
  `);
  
  // Group by table
  const tables = {};
  for (const row of cols.rows) {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(row);
  }
  
  for (const [table, columns] of Object.entries(tables)) {
    console.log('\n=== TABLE: ' + table + ' ===');
    for (const col of columns) {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const type = col.udt_name === 'varchar' ? `varchar(${col.character_maximum_length})` : 
                   col.udt_name === 'numeric' ? `numeric(${col.numeric_precision})` :
                   col.udt_name;
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name}: ${type} ${nullable}${def}`);
    }
  }

  // Get enums
  const enums = await c.query(`
    SELECT t.typname as enum_name, 
           array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  
  console.log('\n\n=== ENUMS ===');
  for (const row of enums.rows) {
    console.log(`  ${row.enum_name}: {${row.enum_values}}`);
  }

  // Get foreign keys
  const fks = await c.query(`
    SELECT tc.table_name, kcu.column_name, 
           ccu.table_name AS foreign_table_name,
           ccu.column_name AS foreign_column_name,
           tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `);
  
  console.log('\n\n=== FOREIGN KEYS ===');
  for (const row of fks.rows) {
    console.log(`  ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name} (${row.constraint_name})`);
  }

  // Get unique constraints
  const uks = await c.query(`
    SELECT tc.table_name, string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns,
           tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY') AND tc.table_schema = 'public'
    GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
    ORDER BY tc.table_name
  `);
  
  console.log('\n\n=== CONSTRAINTS ===');
  for (const row of uks.rows) {
    console.log(`  ${row.table_name}: ${row.columns} (${row.constraint_name})`);
  }

  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
