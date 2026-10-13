import importlib.util
import os
import unittest
from pathlib import Path

os.environ['AW_SEARCH_TESTING'] = '1'
path = Path(__file__).resolve().parents[1] / 'infra/searxng-vercel/aw_search.py'
spec = importlib.util.spec_from_file_location('private_search', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PrivateSearchTests(unittest.TestCase):
    def test_authentication_and_routes(self):
        called = []
        token = module.internal_token('testing-only-authentication-secret-12345')
        app = module.protect(lambda env, start: called.append(env) or [b'ok'], token)
        for auth, route, query, expected in [('', '/search', 'q=test&format=json', '401'),
                                             ('Bearer '+token, '/other', 'q=test&format=json', '404'),
                                             ('Bearer '+token, '/search', 'q=test&format=html', '400')]:
            status = []
            app({'HTTP_AUTHORIZATION': auth, 'REQUEST_METHOD': 'GET', 'PATH_INFO': route, 'QUERY_STRING': query}, lambda value, headers: status.append(value))
            self.assertTrue(status[0].startswith(expected))
        self.assertEqual(called, [])
        self.assertEqual(app({'HTTP_AUTHORIZATION': 'Bearer '+token, 'REQUEST_METHOD': 'GET', 'PATH_INFO': '/search', 'QUERY_STRING': 'q=test&format=json'}, lambda *_: None), [b'ok'])
        self.assertEqual(len(called), 1)

    def test_token_matches_node_derivation(self):
        self.assertEqual(len(module.internal_token('testing-only-authentication-secret-12345')), 64)
        self.assertNotEqual(module.internal_token('one'), module.internal_token('two'))


if __name__ == '__main__':
    unittest.main()
