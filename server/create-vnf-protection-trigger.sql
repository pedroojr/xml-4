-- TRIGGER para proteger valor_liquido (vNF) contra alterações após importação
-- Este trigger impede QUALQUER tentativa de alterar o valor_liquido na tabela nfes
-- Se alguém tentar alterar, o banco aborta a operação com erro

CREATE TRIGGER IF NOT EXISTS trg_lock_vnf 
BEFORE UPDATE OF valor ON nfes 
WHEN NEW.valor <> OLD.valor 
BEGIN 
  SELECT RAISE(ABORT, 'BLOQUEADO: tentativa de alterar valor_liquido (vNF) apos import.'); 
END;

-- Para verificar se o trigger foi criado:
-- SELECT name, sql FROM sqlite_master WHERE type='trigger' AND name='trg_lock_vnf';

-- Para remover o trigger (se necessário):
-- DROP TRIGGER IF EXISTS trg_lock_vnf;