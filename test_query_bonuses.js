const { getConnection } = require('./lib/db');

async function run() {
  try {
    const db = await getConnection();
    const [users] = await db.execute("SELECT id, username FROM users");
    
    console.log("=== TẤT CẢ USERS TRONG HỆ THỐNG ===");
    console.log(users);
    
    if (users.length === 0) {
      console.log("Không có user nào trong hệ thống");
      return;
    }
    
    const [bonuses] = await db.execute("SELECT * FROM special_bonuses");
    console.log("\n=== TẤT CẢ BẢN GHI TRONG special_bonuses ===");
    console.log(JSON.stringify(bonuses, null, 2));

  } catch (err) {
    console.error("Lỗi truy vấn:", err.message);
  }
}

run();
