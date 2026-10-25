import { NetgsmSmsSender } from './netgsm.sms-sender.js';
import { DeliveryError } from './senders.js';

const config = {
  usercode: '8501112233',
  password: 'sifre',
  msgheader: 'EVERBLOOM',
  baseUrl: 'https://netgsm.test',
};

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NetgsmSmsSender', () => {
  it('posts to the REST v2 OTP route with Basic auth and the number without +', async () => {
    const fetchMock = stubFetch({ code: '00', jobid: '123' });
    await new NetgsmSmsSender(config).send('+905551112233', 'Kod: 12345');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://netgsm.test/sms/rest/v2/otp');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('8501112233:sifre').toString('base64')}`,
    );
    expect(JSON.parse(init.body as string)).toEqual({
      msgheader: 'EVERBLOOM',
      encoding: 'TR',
      messages: [{ msg: 'Kod: 12345', no: '905551112233' }],
    });
  });

  it('turns a Netgsm error code into a DeliveryError with the reason', async () => {
    stubFetch({ code: '40' });
    await expect(
      new NetgsmSmsSender(config).send('+905551112233', 'Kod'),
    ).rejects.toThrow(
      new DeliveryError('sender header (msgheader) not defined'),
    );
  });

  it('treats an HTTP error as a failed delivery', async () => {
    stubFetch({}, 503);
    await expect(
      new NetgsmSmsSender(config).send('+905551112233', 'Kod'),
    ).rejects.toBeInstanceOf(DeliveryError);
  });

  it('treats a network error as a failed delivery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    await expect(
      new NetgsmSmsSender(config).send('+905551112233', 'Kod'),
    ).rejects.toBeInstanceOf(DeliveryError);
  });
});
