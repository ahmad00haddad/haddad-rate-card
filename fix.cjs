
const fs = require('fs');
let content = fs.readFileSync('src/routes/admin.tsx', 'utf8');
content = content.replace(
  'is_available: boolean;\n  };',
  'is_available: boolean;\n    daily_rental_price?: number;\n    rental_percentage?: number;\n  };'
);
content = content.replace(
  'original_price: 0, image_path: "", is_available: true };',
  'original_price: 0, image_path: "", is_available: true, daily_rental_price: 0, rental_percentage: 0 };'
);
fs.writeFileSync('src/routes/admin.tsx', content);

