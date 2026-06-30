import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Contact() {
  const [settings, setSettings] = useState({});
  const [qr, setQr] = useState(null);

  useEffect(() => {
    api.get('/settings').then(setSettings);
    api.get(`/qrcode?url=${encodeURIComponent(window.location.origin)}`).then((d) => setQr(d.qr));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Liên hệ</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="card p-8 space-y-6">
          <div>
            <h3 className="font-semibold text-youth mb-1">Địa chỉ</h3>
            <p className="text-gray-600">{settings.contact_address}</p>
          </div>
          <div>
            <h3 className="font-semibold text-youth mb-1">Điện thoại</h3>
            <p className="text-gray-600">{settings.contact_phone}</p>
          </div>
          <div>
            <h3 className="font-semibold text-youth mb-1">Email</h3>
            <p className="text-gray-600">{settings.contact_email}</p>
          </div>
        </div>
        <div className="card p-8 text-center">
          <h3 className="font-bold text-primary mb-4">Quét QR Code truy cập website</h3>
          {qr && <img src={qr} alt="QR Code" className="mx-auto w-48 h-48" />}
          <p className="text-sm text-gray-500 mt-4">{window.location.origin}</p>
        </div>
      </div>
    </div>
  );
}
