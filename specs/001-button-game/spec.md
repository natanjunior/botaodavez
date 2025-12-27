# Feature Specification: Botão da Vez

**Feature Branch**: `001-button-game`
**Created**: 2025-12-26
**Status**: Draft
**Input**: User description: "App de jogo de botão para família"

## User Scenarios & Verification *(mandatory)*

### User Story 1 - Criar e Configurar Game (Priority: P1)

Administrador cria um novo game, gera token de acesso, e configura participantes e equipes para começar a jogar.

**Why this priority**: Esta é a funcionalidade base do sistema. Sem criar um game e adicionar participantes, nenhuma outra funcionalidade pode ser utilizada. É o MVP essencial.

**Manual Verification**: Pode ser verificado criando um game no painel do administrador, obtendo o token gerado, e confirmando que participantes conseguem entrar usando esse token.

**Acceptance Scenarios**:

1. **Given** administrador autenticado no sistema, **When** cria um novo game, **Then** sistema gera token alfanumérico único e exibe dashboard do game com 0 participantes
2. **Given** token de game existente, **When** participante acessa URL com token ou insere token na tela inicial, **Then** sistema solicita nome do participante e permite entrada no game
3. **Given** participante fornece nome, **When** entra no game, **Then** nome aparece na lista de participantes do administrador com status online
4. **Given** administrador no dashboard do game, **When** visualiza participantes, **Then** vê lista com nome de cada participante e indicador de status online/offline em tempo real
5. **Given** administrador com ao menos 2 participantes, **When** cria equipes e atribui participantes às equipes, **Then** participantes ficam agrupados por equipe com cor identificadora

---

### User Story 2 - Executar Rodada Individual (Priority: P1)

Administrador inicia uma rodada entre participantes selecionados e o sistema determina quem clicou no botão verde primeiro.

**Why this priority**: Esta é a funcionalidade core do app - a disputa do botão. Sem isso, o app não cumpre seu propósito principal. Junto com US1, forma o MVP completo.

**Manual Verification**: Criar rodada com 2+ participantes online, iniciar rodada, verificar que botão muda de amarelo para verde nos dispositivos dos participantes, e confirmar que sistema identifica corretamente o vencedor (quem teve menor tempo de resposta).

**Acceptance Scenarios**:

1. **Given** game com ao menos 2 participantes online, **When** administrador seleciona participantes para rodada, **Then** botão desabilitado aparece na tela dos participantes selecionados
2. **Given** participantes selecionados para rodada, **When** administrador clica em "Jogar" (todos online), **Then** sistema sorteia tempo aleatório (em milissegundos), envia para participantes, e inicia contagem regressiva local com botão amarelo
3. **Given** contagem regressiva em andamento, **When** participante clica no botão amarelo antes do tempo, **Then** botão fica vermelho e participante é eliminado da rodada
4. **Given** contagem regressiva termina (tempo = 0), **When** botão fica verde, **Then** participante pode clicar e sistema registra tempo de reação em milissegundos
5. **Given** participante clica botão verde, **When** envia tempo de reação para sistema, **Then** sistema compara tempos de todos participantes e identifica vencedor (menor tempo)
6. **Given** todos participantes finalizaram ou foram eliminados, **When** sistema determina resultado, **Then** exibe vencedor para administrador e todos participantes (ou "sem vencedor" se todos eliminados, ou lista de empatados)
7. **Given** rodada em andamento demorando muito, **When** administrador para a rodada manualmente, **Then** sistema cancela rodada e informa que não houve vencedor

---

### User Story 3 - Gerenciar Múltiplas Rodadas (Priority: P2)

Administrador pode jogar a mesma rodada múltiplas vezes com diferentes configurações de participantes, mantendo histórico apenas do último resultado.

**Why this priority**: Permite flexibilidade no uso do app durante jogos e brincadeiras, mas o sistema ainda funciona sem essa funcionalidade de reconfiguração.

**Manual Verification**: Após completar uma rodada, clicar em "Jogar Outra Vez", alterar participantes selecionados, executar nova rodada e verificar que apenas o último resultado é mantido.

**Acceptance Scenarios**:

1. **Given** rodada completada com resultado exibido, **When** administrador clica em "Jogar Outra Vez", **Then** sistema permite reconfigurar participantes da rodada mantendo a mesma rodada
2. **Given** administrador altera participantes da rodada, **When** inicia nova jogada, **Then** apenas participantes selecionados veem botão habilitado
3. **Given** rodada jogada múltiplas vezes, **When** administrador consulta resultado da rodada, **Then** sistema exibe apenas resultado da última jogada (sobrescrevendo anteriores)

---

### User Story 4 - Visualização para Espectadores (Priority: P3)

Participantes que não estão na rodada atual podem ver quem está jogando e acompanhar o resultado em tempo real.

**Why this priority**: Melhora a experiência mas não é crítico para o funcionamento básico. Participantes fora da rodada podem simplesmente aguardar sem visualização especial.

**Manual Verification**: Como participante não selecionado para rodada, verificar que tela mostra lista de participantes jogando e, quando rodada termina, exibe o vencedor.

**Acceptance Scenarios**:

1. **Given** participante não selecionado para rodada em andamento, **When** visualiza app, **Then** vê lista de participantes jogando a rodada atual
2. **Given** rodada finalizada com vencedor, **When** participante espectador visualiza app, **Then** vê resultado da rodada (nome do vencedor ou empate/sem vencedor)

---

### Edge Cases

- O que acontece quando participante perde conexão durante a rodada? Sistema deve marcá-lo como offline e eliminar da rodada atual, permitindo que administrador veja status e decida se cancela ou continua.
- Como o sistema lida com empate perfeito (mesmo tempo de reação em milissegundos)? Deve listar todos os empatados como vencedores.
- O que acontece se administrador tentar iniciar rodada com participante offline? Botão "Jogar" fica desabilitado até todos selecionados estarem online.
- Como participante sai de um game? Fecha o app ou navegador, sistema detecta desconexão e marca como offline.
- Administrador pode excluir participantes do game? Sim, deve ter opção de remover participante da lista.
- Limite de participantes por game? Assumir até 50 participantes para performance razoável em ambiente familiar.
- Token de game expira? Assumir que games permanecem ativos indefinidamente enquanto não excluídos pelo administrador.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema MUST permitir administrador criar conta com login e senha
- **FR-002**: Sistema MUST permitir administrador criar novo game e gerar token alfanumérico único de 6-8 caracteres
- **FR-003**: Sistema MUST permitir participantes entrarem em game via URL com token ou inserindo token manualmente
- **FR-004**: Sistema MUST permitir participantes entrarem fornecendo apenas nome (sem login/senha)
- **FR-005**: Sistema MUST exibir lista de participantes do game para administrador com indicador de status online/offline em tempo real
- **FR-006**: Sistema MUST permitir administrador criar equipes com nome e cor, e atribuir participantes às equipes
- **FR-007**: Sistema MUST permitir administrador criar rodada selecionando ao menos 2 participantes ou 2 equipes
- **FR-008**: Sistema MUST exibir botão desabilitado na tela de participantes selecionados para rodada
- **FR-009**: Sistema MUST desabilitar botão "Jogar" do administrador se qualquer participante selecionado estiver offline
- **FR-010**: Sistema MUST sortear tempo aleatório (1000-5000 milissegundos) ao iniciar rodada e enviar para participantes
- **FR-011**: Sistema MUST iniciar contagem regressiva local no dispositivo do participante exibindo botão amarelo
- **FR-012**: Sistema MUST eliminar participante que clicar botão amarelo (antes do tempo), marcando botão como vermelho
- **FR-013**: Sistema MUST mudar botão para verde quando contagem regressiva chegar a zero e iniciar cronômetro de tempo de reação
- **FR-014**: Sistema MUST registrar tempo de reação em milissegundos quando participante clicar botão verde
- **FR-015**: Sistema MUST comparar tempos de reação de todos participantes e determinar vencedor (menor tempo)
- **FR-016**: Sistema MUST exibir resultado da rodada (vencedor, empate, ou sem vencedor) para administrador e todos participantes
- **FR-017**: Sistema MUST permitir administrador parar rodada em andamento manualmente
- **FR-018**: Sistema MUST permitir administrador jogar mesma rodada novamente com possibilidade de alterar participantes
- **FR-019**: Sistema MUST manter apenas resultado da última jogada de cada rodada (sobrescrever resultados anteriores)
- **FR-020**: Sistema MUST exibir para participantes não selecionados quem está jogando a rodada atual

### Key Entities

- **Administrador**: Usuário autenticado responsável por criar e gerenciar games. Atributos: login, senha encriptada, lista de games criados.

- **Game**: Sessão de jogo com múltiplos participantes. Atributos: token alfanumérico único, ID do administrador, lista de participantes, lista de equipes, lista de rodadas, data de criação.

- **Participante**: Pessoa que entra no game para jogar. Atributos: nome, imagem de perfil (opcional), equipe (opcional), status online/offline, timestamp da última atividade.

- **Equipe**: Agrupamento de participantes. Atributos: nome, cor (formato hexadecimal), lista de participantes.

- **Rodada**: Disputa entre participantes selecionados. Atributos: lista de participantes/equipes selecionados, resultado da última jogada (vencedor, tempo de reação, participantes eliminados), status (aguardando/em andamento/finalizada), timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrador consegue criar game e obter token em menos de 30 segundos
- **SC-002**: Participantes conseguem entrar em game usando token em menos de 15 segundos
- **SC-003**: Sistema detecta mudança de status online/offline de participantes em até 3 segundos
- **SC-004**: Sistema inicia rodada e sincroniza contagem regressiva em todos dispositivos participantes com diferença máxima de 200 milissegundos
- **SC-005**: Sistema determina vencedor baseado em tempo de reação com precisão de milissegundos (margem de erro < 50ms)
- **SC-006**: Sistema suporta até 50 participantes simultâneos em um game sem degradação perceptível de performance
- **SC-007**: 90% dos participantes conseguem clicar no botão verde e enviar tempo de reação sem erros de conexão
- **SC-008**: Sistema exibe resultado da rodada para todos usuários (admin e participantes) em até 2 segundos após último participante clicar

## Assumptions

- Participantes utilizarão dispositivos modernos (smartphones, tablets, computadores) com navegadores web atualizados
- Conexão de internet razoável disponível para todos participantes (mínimo 3G/4G ou WiFi doméstico)
- Games serão utilizados em contexto familiar/amigos, não em ambiente competitivo profissional
- Administrador tem dispositivo com tela adequada para gerenciar múltiplos participantes (mínimo smartphone, ideal tablet/computador)
- Sistema será usado em português brasileiro
- Tempo de reação humano típico varia de 150ms a 300ms, tempos menores que 100ms indicam possível clique antecipado
- Comunicação em tempo real será necessária (WebSockets ou similar para sincronização)
- Imagens de perfil (funcionalidade futura) terão tamanho limitado (ex: 500KB) e formatos padrão (JPG, PNG)
