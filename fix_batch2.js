const fs = require('fs');
let content = fs.readFileSync('curriculum_batch_2.js', 'utf8');

// If content string doesn't end with a comma before lesson_type
content = content.replace(/"\s*\n\s*lesson_type:\s*"text"/g, '",\n    lesson_type: "text"');
// Remove duplicate lesson_type
content = content.replace(/lesson_type:\s*"text",\s*\n\s*lesson_type:\s*"text"/g, 'lesson_type: "text"');

fs.writeFileSync('curriculum_batch_2.js', content, 'utf8');

try {
  const data = require('./curriculum_batch_2.js');
  console.log('Fixed! Count:', data.length);
} catch (e) {
  console.error('Still error:', e.message);
}
