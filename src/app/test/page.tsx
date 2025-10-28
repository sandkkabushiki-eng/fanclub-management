export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>テストページ</h1>
      <p>サーバーは正常に動作しています！</p>
      <p>現在時刻: {new Date().toLocaleString()}</p>
    </div>
  );
}

