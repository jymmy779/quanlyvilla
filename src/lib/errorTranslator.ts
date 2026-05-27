const errorMessages: Record<string, string> = {
  'Email này đã được đăng ký trong hệ thống.': 'Email này đã được đăng ký trong hệ thống.',
  'Email này đã được đăng ký.': 'Email này đã được đăng ký.',
  'Vui lòng điền đầy đủ thông tin.': 'Vui lòng điền đầy đủ thông tin.',
  'Mật khẩu phải từ 6 ký tự trở lên.': 'Mật khẩu phải từ 6 ký tự trở lên.',
  'Email hoặc mật khẩu không hợp lệ.': 'Email hoặc mật khẩu không hợp lệ.',
  'Tài khoản của bạn chưa được kích hoạt.': 'Tài khoản của bạn chưa được kích hoạt.',
  'Chưa xác thực quyền truy cập.': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'Từ chối truy cập.': 'Bạn không có quyền thực hiện thao tác này.',
  'Không tìm thấy hồ sơ người dùng.': 'Không tìm thấy hồ sơ người dùng.',
  'Không tìm thấy tài khoản.': 'Không tìm thấy tài khoản.',
  'Không thể cập nhật hồ sơ.': 'Không thể cập nhật hồ sơ. Vui lòng thử lại.',
  'Không thể đổi mật khẩu.': 'Không thể đổi mật khẩu. Vui lòng thử lại.',
  'Không thể gửi yêu cầu đặt lại mật khẩu.': 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.',
  'Đã xảy ra lỗi hệ thống.': 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
  'Token không hợp lệ.': 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
};

export const translateAuthError = (error: string): string => {
  if (!error) return 'Đã xảy ra lỗi không xác định.';
  return errorMessages[error] || error;
};