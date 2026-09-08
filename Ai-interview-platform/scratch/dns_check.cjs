const dns = require('dns');

const hosts = [
  'aws-1-ap-south-1.pooler.supabase.com',
  'db.ukdiydoqhirukeqwlpld.supabase.co',
  'ukdiydoqhirukeqwlpld.supabase.co'
];

hosts.forEach(host => {
  dns.lookup(host, (err, address, family) => {
    console.log(`Host: ${host}`);
    if (err) {
      console.log(`Error: ${err.message}`);
    } else {
      console.log(`Address: ${address}, Family: IPv${family}`);
    }
    console.log('---');
  });
});
