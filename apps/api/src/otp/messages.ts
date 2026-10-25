// Texts of the transactional messages. Keep them free of any promotion:
// OTP and service messages are outside İYS only while they carry no
// commercial content (İleti Yönetim Sistemi yönetmeliği m.6).

export const otpSms = (code: string) =>
  `EverBloom doğrulama kodunuz: ${code}. Kod 10 dakika geçerlidir, kimseyle paylaşmayın.`;

export const emailVerificationMail = (code: string) => ({
  subject: 'EverBloom e-posta doğrulama kodunuz',
  text: [
    `E-posta adresinizi doğrulamak için kodunuz: ${code}`,
    '',
    'Kod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.',
  ].join('\n'),
});

export const passwordResetMail = (code: string) => ({
  subject: 'EverBloom şifre sıfırlama kodunuz',
  text: [
    `Şifrenizi sıfırlamak için kodunuz: ${code}`,
    '',
    'Kod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız şifreniz değişmez; bu e-postayı yok sayabilirsiniz.',
  ].join('\n'),
});
