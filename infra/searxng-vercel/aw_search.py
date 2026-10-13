"""Private WSGI gateway for the Vercel service binding. No public ingress."""
import hashlib
import hmac
import os
from urllib.parse import parse_qs


def internal_token(secret):
    return hmac.new(secret.encode(), b'awdevelop:searxng:v1', hashlib.sha256).hexdigest()


def protect(engine, token):
    def application(environ, start_response):
        supplied = environ.get('HTTP_AUTHORIZATION', '')
        if not hmac.compare_digest(supplied, 'Bearer ' + token):
            start_response('401 Unauthorized', [('Content-Type', 'application/json')])
            return [b'{"error":"Unauthorized"}']
        if environ.get('REQUEST_METHOD') != 'GET' or environ.get('PATH_INFO') != '/search':
            start_response('404 Not Found', [('Content-Type', 'application/json')])
            return [b'{"error":"Not found"}']
        params = parse_qs(environ.get('QUERY_STRING', ''))
        query = params.get('q', [''])[0]
        if not query or len(query) > 500 or params.get('format') != ['json']:
            start_response('400 Bad Request', [('Content-Type', 'application/json')])
            return [b'{"error":"Invalid query"}']
        return engine(environ, start_response)
    return application


def create_app():
    secret = os.environ.get('BETTER_AUTH_SECRET', '')
    if len(secret) < 32:
        raise RuntimeError('The private search service requires the existing authentication secret.')
    token = internal_token(secret)
    session_secret = hmac.new(secret.encode(), b'awdevelop:searxng:session', hashlib.sha256).hexdigest()
    # Do not give the search engines database, Vercel or authentication credentials.
    for key in list(os.environ):
        if not (key in {'PATH', 'HOME', 'LANG', 'SSL_CERT_DIR', 'SSL_CERT_FILE', 'REQUESTS_CA_BUNDLE', 'CURL_CA_BUNDLE', 'PYTHONPATH', 'SEARXNG_SETTINGS_PATH'} or key.startswith('GRANIAN_')):
            del os.environ[key]
    os.environ['SEARXNG_SECRET'] = session_secret
    from searx.webapp import app as engine
    return protect(engine, token)


if os.environ.get('AW_SEARCH_TESTING') != '1':
    app = create_app()
