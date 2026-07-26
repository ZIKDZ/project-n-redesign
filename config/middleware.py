class NoIndexPrivatePathsMiddleware:
    """
    Adds X-Robots-Tag: noindex, nofollow to any response under a private
    prefix. This is a hard HTTP-level signal — search engines honour it
    even for pages linked in from elsewhere, unlike robots.txt which only
    stops the crawl, not the index, if a link exists.
    """
    PRIVATE_PREFIXES = ('/dashboard', '/login', '/shop', '/admin', '/api')

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith(self.PRIVATE_PREFIXES):
            response['X-Robots-Tag'] = 'noindex, nofollow'
        return response