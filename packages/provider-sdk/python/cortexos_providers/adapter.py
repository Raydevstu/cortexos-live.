class ProviderAdapter:
    async def connect(self) -> None: raise NotImplementedError
    async def list_models(self) -> list: raise NotImplementedError
    async def generate(self, *args, **kwargs): raise NotImplementedError
    async def stream(self, *args, **kwargs): raise NotImplementedError
    async def embeddings(self, *args, **kwargs): raise NotImplementedError
    async def cancel(self, *args, **kwargs): raise NotImplementedError
    async def health_check(self) -> bool: raise NotImplementedError
