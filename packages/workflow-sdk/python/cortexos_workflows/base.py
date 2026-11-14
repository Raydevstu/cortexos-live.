class CortexWorkflow:
    async def start(self): raise NotImplementedError
    async def execute(self): raise NotImplementedError
    async def monitor(self): raise NotImplementedError
    async def recover(self): raise NotImplementedError
    async def complete(self): raise NotImplementedError
    async def rollback(self): raise NotImplementedError

class Activity:
    async def execute(self): raise NotImplementedError
    async def validate(self): raise NotImplementedError
    async def audit(self): raise NotImplementedError
    async def report(self): raise NotImplementedError
