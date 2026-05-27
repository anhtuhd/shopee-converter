const { getConnection } = require('./lib/db');

async function run() {
  try {
    const db = await getConnection();
    const userId = 2; // anhtuhd

    const [users] = await db.execute(
      'SELECT id, username, email, commission_rate FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      console.log("Không tìm thấy user");
      return;
    }

    const userProfile = { ...users[0] };

    // Mô phỏng query active_special_bonus trong app/api/profile/route.js
    const [activeSpecialBonuses] = await db.execute(`
      SELECT id, bonus_rate, description, marquee_text 
      FROM special_bonuses 
      WHERE user_id = ? AND NOW() BETWEEN start_date AND end_date
      ORDER BY bonus_rate DESC LIMIT 1
    `, [userId]);

    userProfile.active_special_bonus = activeSpecialBonuses.length > 0 ? activeSpecialBonuses[0] : null;

    console.log("=== THÔNG TIN USER PROFILE TRẢ VỀ ===");
    console.log(JSON.stringify(userProfile, null, 2));

  } catch (err) {
    console.error("Lỗi:", err.message);
  }
}

run();
