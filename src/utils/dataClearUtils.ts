// ローカルデータクリア用のユーティリティ
export const clearLocalData = () => {
  console.log('🧹 ローカルデータクリア開始');
  
  // 削除対象のキーを特定
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('fanclub-model') || 
      key.includes('fanclub-global') ||
      key.includes('fanclub-model-data')
    )) {
      keysToDelete.push(key);
    }
  }
  
  console.log('🗑️ 削除対象キー:', keysToDelete);
  
  // データを削除
  keysToDelete.forEach(key => {
    localStorage.removeItem(key);
    console.log('✅ 削除完了:', key);
  });
  
  console.log('🧹 ローカルデータクリア完了');
  return keysToDelete.length;
};

// 保持するキー（認証関連）
export const getPreservedKeys = () => {
  const preservedKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('supabase') ||
      key.includes('auth') ||
      key.includes('sb-')
    )) {
      preservedKeys.push(key);
    }
  }
  return preservedKeys;
};

