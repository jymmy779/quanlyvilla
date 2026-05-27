'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPageDisabled() {
  const router = useRouter();

  useEffect(() => {
    // Chặn cứng và chuyển hướng ngay lập tức về trang đăng nhập
    router.replace('/login');
  }, [router]);

  return null;
}
