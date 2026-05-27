import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom fetch implementation with 3s fast-timeout and auto-retry for GET requests
const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit, isRetry = false): Promise<Response> => {
  const method = init?.method ? init.method.toUpperCase() : 'GET';
  const isGet = method === 'GET';
  
  // Lần thử đầu tiên của GET chỉ đợi 3s để nhanh chóng phát hiện kết nối chết, lần sau/hoặc các method khác đợi lâu hơn
  const timeoutMs = isGet ? (isRetry ? 12000 : 3000) : 15000;
  
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Yêu cầu kết nối quá hạn (${timeoutMs}ms).`));
    }, timeoutMs);

    // Merge existing signal if provided
    if (init?.signal) {
      init.signal.addEventListener('abort', () => {
        controller.abort();
        reject(new Error('Yêu cầu bị hủy bỏ.'));
      });
    }

    fetch(input, { ...init, signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        
        const isUserAborted = init?.signal?.aborted;
        
        // Chỉ tự động thử lại đối với yêu cầu GET (an toàn, không ghi đè dữ liệu)
        // và khi không phải do người dùng chủ động click hủy (unmount)
        if (isGet && !isRetry && !isUserAborted) {
          console.warn(`[Supabase Fetch] Yêu cầu GET bị nghẽn quá ${timeoutMs}ms. Đang tự động thiết lập kết nối mới và thử lại...`);
          fetchWithTimeout(input, init, true).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
