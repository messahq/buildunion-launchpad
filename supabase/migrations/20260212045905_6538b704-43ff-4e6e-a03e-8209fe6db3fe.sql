-- Change embedding column from vector(768) to vector(384) for gte-small model
ALTER TABLE public.obc_embeddings ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384);