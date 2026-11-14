class CortexAgent:
    async def plan(self): raise NotImplementedError
    async def execute(self): raise NotImplementedError
    async def validate(self): raise NotImplementedError
    async def summarize(self): raise NotImplementedError
    async def create_artifact(self): raise NotImplementedError
    async def handoff(self): raise NotImplementedError
