import { SanitizePipe } from '../../src/common/pipes/sanitize.pipe';

describe('SanitizePipe', () => {
  let pipe: SanitizePipe;

  beforeEach(() => { pipe = new SanitizePipe(); });

  const transform = (value: any) => pipe.transform(value, { type: 'body', metatype: Object, data: '' });

  it('should strip script tags', () => {
    expect(transform('<script>alert("xss")</script>Hello')).toBe('Hello');
  });

  it('should strip event handlers', () => {
    expect(transform('<img onerror="alert(1)" src="x">')).toContain('<img');
    expect(transform('<img onerror="alert(1)" src="x">')).not.toContain('onerror');
  });

  it('should strip javascript: protocol', () => {
    expect(transform('javascript:alert(1)')).not.toContain('javascript:');
  });

  it('should strip iframes', () => {
    expect(transform('<iframe src="evil.com"></iframe>')).not.toContain('iframe');
  });

  it('should leave normal text untouched', () => {
    expect(transform('مرحبا بك في واسل شات')).toBe('مرحبا بك في واسل شات');
  });

  it('should sanitize nested objects', () => {
    const result = transform({ name: '<script>bad</script>Ahmed', phone: '01001234567' });
    expect(result.name).toBe('Ahmed');
    expect(result.phone).toBe('01001234567');
  });

  it('should sanitize arrays', () => {
    const result = transform(['<script>x</script>hello', 'safe']);
    expect(result[0]).toBe('hello');
    expect(result[1]).toBe('safe');
  });

  it('should not transform non-body params', () => {
    const value = '<script>test</script>';
    expect(pipe.transform(value, { type: 'query', metatype: String, data: 'q' })).toBe(value);
  });
});
