// GERADO por operations/tools/ctl.py sync — não editar.
// Fallback offline do Command Center; a verdade está em control/*.json.
window.CC_BUNDLE = {
 "generated_at": "2026-09-30T18:17:07Z",
 "files": {
  "CURRENT_STATE.json": {
   "schema": "desmentindo.control.current_state.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "timezone": "America/Sao_Paulo",
   "operational_date": "2026-09-30",
   "last_run": null,
   "next_run": {
    "routine": "MORNING_OPEN",
    "scheduled_for": null,
    "mode": "MANUAL",
    "note": "Schedules desligados. Próximo passo: ciclo manual MORNING -> AFTERNOON -> EVENING via Claude Code após revisão."
   },
   "routines": {
    "MORNING_OPEN": {
     "status": "NOT_EXECUTED",
     "last_run_id": null,
     "started_at": null,
     "finished_at": null,
     "summary": null
    },
    "AFTERNOON_UPDATE": {
     "status": "NOT_EXECUTED",
     "last_run_id": null,
     "started_at": null,
     "finished_at": null,
     "summary": null
    },
    "EVENING_CLOSE": {
     "status": "NOT_EXECUTED",
     "last_run_id": null,
     "started_at": null,
     "finished_at": null,
     "summary": null
    }
   },
   "publish_state": "OFF",
   "human_gate_state": "REQUIRED",
   "open_stories": {
    "value": null,
    "state": "NOT_AVAILABLE",
    "source": null,
    "note": "DAY-STORIES fora do repositório."
   },
   "pending_human_reviews": {
    "value": 0,
    "state": "MEASURED",
    "source": "control/HUMAN_REVIEW_QUEUE.json"
   },
   "open_decisions": {
    "value": 3,
    "state": "MEASURED",
    "source": "control/DECISION_QUEUE.json"
   },
   "active_incidents": {
    "value": 0,
    "state": "MEASURED",
    "source": "control/INCIDENTS.json"
   },
   "degraded_services": [
    "CORPUS"
   ],
   "unknown_services": [
    "NEWS_HUB",
    "DAILY_ENGINE",
    "RHR",
    "AUDIT_INDEX",
    "DAY_STORIES",
    "SITE"
   ],
   "overall_status": "DEGRADED",
   "last_operational_commit": null,
   "last_successful_run": null,
   "lock": {
    "held": false,
    "routine": null,
    "holder": null,
    "run_id": null,
    "acquired_at": null,
    "expires_at": null
   }
  },
  "HEALTH.json": {
   "schema": "desmentindo.control.health.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "states": [
    "HEALTHY",
    "DEGRADED",
    "FAILED",
    "UNKNOWN",
    "NOT_CONFIGURED"
   ],
   "invariants": [
    "FAILED != ZERO_RESULTS",
    "QUERY_UNAVAILABLE != NO_MATCH",
    "NOT_EXECUTED != NO_MATCH",
    "UNKNOWN significa ausência de sinal, nunca 'provavelmente OK'"
   ],
   "components": {
    "NEWS_HUB": {
     "status": "UNKNOWN",
     "summary": "Roda fora deste repositório (Vault / Claude Project). Nenhum sinal chega ao GitHub ainda.",
     "location": "EXTERNAL",
     "signal_source": null,
     "last_success": null,
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": null,
     "error_summary": null,
     "evidence_url": null
    },
    "DAILY_ENGINE": {
     "status": "UNKNOWN",
     "summary": "Rotinas MORNING/AFTERNOON/EVENING ainda não executadas via Claude Code. Estado anterior vive no Claude Project.",
     "location": "EXTERNAL",
     "signal_source": null,
     "last_success": null,
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": "NOT_EXECUTED",
     "error_summary": null,
     "evidence_url": null
    },
    "RHR": {
     "status": "UNKNOWN",
     "summary": "RHR_ENGINE não está neste repositório. Consultas históricas hoje só são possíveis sobre o dataset AG publicado.",
     "location": "EXTERNAL",
     "signal_source": null,
     "last_success": null,
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": "NOT_EXECUTED",
     "error_summary": null,
     "evidence_url": null
    },
    "CORPUS": {
     "status": "DEGRADED",
     "summary": "1 de 5 fontes pesquisável (Alexandre Garcia 3701/3701). Te Atualizei 93/581 e Caio Coppolla 8/553 parciais e não pesquisáveis; Revista Oeste e Gazeta do Povo sem adaptador.",
     "location": "GITHUB",
     "signal_source": "data/manifest.0977832fa154.json + data/corpus/manifest.json",
     "last_success": "2026-09-29T15:09:56Z",
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": "MANIFEST_BUILD CORPUS_UI_V2_20260929T120500Z",
     "error_summary": null,
     "evidence_url": "https://github.com/histudyoficial-crypto/desmentindo/blob/main/data/corpus/manifest.json"
    },
    "AUDIT_INDEX": {
     "status": "UNKNOWN",
     "summary": "Audit index não está neste repositório. O índice publicado data/corpus/index.* cobre 29 pessoas / 13 casos / 1986 links, mas não é o audit index.",
     "location": "EXTERNAL",
     "signal_source": null,
     "last_success": null,
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": null,
     "error_summary": null,
     "evidence_url": null
    },
    "DAY_STORIES": {
     "status": "UNKNOWN",
     "summary": "DAY-STORIES não estão no repositório. Contagem de histórias abertas: NOT_AVAILABLE.",
     "location": "EXTERNAL",
     "signal_source": null,
     "last_success": null,
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": null,
     "error_summary": null,
     "evidence_url": null
    },
    "HUMAN_REVIEW": {
     "status": "HEALTHY",
     "summary": "Fila operacional criada em control/HUMAN_REVIEW_QUEUE.json; decisões por GitHub Issue (label human-gate).",
     "location": "GITHUB",
     "signal_source": "control/HUMAN_REVIEW_QUEUE.json",
     "last_success": "2026-09-30T18:05:00Z",
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": "QUEUE_INITIALIZED",
     "error_summary": null,
     "evidence_url": null
    },
    "PUBLISHER": {
     "status": "HEALTHY",
     "summary": "Workflow horário roda com sucesso desde o run #11. Outbox vazio (NO_PENDING_CANDIDATES). Nunca faz merge; PR exige humano.",
     "location": "GITHUB",
     "signal_source": "GitHub Actions: desmentindo-publisher.yml",
     "last_success": "2026-09-30T17:18:01Z",
     "last_failure": "2026-09-30T01:36:51Z",
     "duration_seconds": 4,
     "next_run": "2026-09-30T19:00:00Z",
     "last_result": "NO_PENDING_CANDIDATES",
     "error_summary": null,
     "evidence_url": "https://github.com/histudyoficial-crypto/desmentindo/actions/runs/36750368389"
    },
    "SITE": {
     "status": "UNKNOWN",
     "summary": "Último deploy FTP para Locaweb OK (a49ea9c). Sonda de disponibilidade de desmentindo.com.br ainda não existe (NOT_EXECUTED).",
     "location": "GITHUB",
     "signal_source": "GitHub Actions: deploy-locaweb.yml",
     "last_success": "2026-09-30T01:18:01Z",
     "last_failure": null,
     "duration_seconds": 16,
     "next_run": null,
     "last_result": "DEPLOY_OK",
     "error_summary": null,
     "evidence_url": "https://github.com/histudyoficial-crypto/desmentindo/actions/runs/36654422019"
    },
    "VIDEO_ENGINE": {
     "status": "NOT_CONFIGURED",
     "summary": "Piloto visual em refinamento; sem voz final; sem pipeline de produção. Ver control/VIDEO_ENGINE.json.",
     "location": "EXTERNAL",
     "signal_source": "control/VIDEO_ENGINE.json",
     "last_success": null,
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": null,
     "error_summary": null,
     "evidence_url": null
    },
    "ANALYTICS": {
     "status": "NOT_CONFIGURED",
     "summary": "Nenhum script de analytics no index.html. Todas as métricas de resultado ficam NOT_CONFIGURED.",
     "location": "GITHUB",
     "signal_source": "index.html (inspeção)",
     "last_success": null,
     "last_failure": null,
     "duration_seconds": null,
     "next_run": null,
     "last_result": null,
     "error_summary": null,
     "evidence_url": null
    }
   }
  },
  "HUMAN_REVIEW_QUEUE.json": {
   "schema": "desmentindo.control.human_review_queue.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "statuses": [
    "WAITING_REVIEW",
    "APPROVED",
    "CHANGES_REQUESTED",
    "HOLD",
    "REJECTED"
   ],
   "policy": [
    "Nenhuma conclusão política substantiva é publicada sem status APPROVED dado por Johnny.",
    "Decisão registrada via GitHub Issue com label human-gate; Claude Code aplica a decisão aqui e cita a issue em decision.decision_ref.",
    "Repositório público: registrar somente resumos e links; nunca rascunho integral."
   ],
   "items": []
  },
  "INCIDENTS.json": {
   "schema": "desmentindo.control.incidents.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "types": [
    "CONCURRENCY_COLLISION",
    "CAPACITY_DEGRADATION",
    "SOURCE_UNAVAILABLE",
    "FUTURE_TIMESTAMP_ANOMALY",
    "RHR_UNAVAILABLE",
    "PUBLISHER_FAILURE",
    "SCHEMA_FAILURE",
    "DEPLOY_FAILURE",
    "OTHER"
   ],
   "severities": [
    "SEV1",
    "SEV2",
    "SEV3",
    "SEV4"
   ],
   "statuses": [
    "OPEN",
    "MITIGATED",
    "RESOLVED"
   ],
   "items": [
    {
     "incident_id": "INC-20260930-001",
     "timestamp": "2026-09-29T23:57:09Z",
     "component": "PUBLISHER",
     "type": "PUBLISHER_FAILURE",
     "severity": "SEV3",
     "description": "Publisher runs #1 a #10 falharam na autenticação Dropbox (refresh token OAuth) logo após a instalação do workflow.",
     "impact": "Nenhum candidato processado entre 2026-09-29T23:56Z e 2026-09-30T01:36Z. Outbox não tinha candidatos reais; sem perda de dados, nada publicado indevidamente (fail-closed).",
     "status": "RESOLVED",
     "resolution": "Commits d803bfa (tratamento de erro OAuth) e a49ea9c (Content-Type form-urlencoded no refresh). Run #11 (2026-09-30T01:47Z) e seguintes com sucesso.",
     "resolved_at": "2026-09-30T01:47:15Z",
     "detected_by": "claude-code (histórico GitHub Actions)",
     "evidence_url": "https://github.com/histudyoficial-crypto/desmentindo/actions/runs/36655935074"
    }
   ]
  },
  "DECISION_QUEUE.json": {
   "schema": "desmentindo.control.decision_queue.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "note": "Decisões não editoriais que precisam de Johnny (PR, produto, direitos, incidente crítico). Revisões editoriais ficam em HUMAN_REVIEW_QUEUE.json.",
   "kinds": [
    "PR_APPROVAL",
    "PRODUCT_DECISION",
    "IMAGE_RIGHTS",
    "CRITICAL_INCIDENT",
    "CREDENTIAL",
    "OTHER"
   ],
   "statuses": [
    "OPEN",
    "RESOLVED",
    "DEFERRED"
   ],
   "items": [
    {
     "item_id": "DQ-0001",
     "kind": "PRODUCT_DECISION",
     "priority": "P0",
     "title": "Onde vive o conteúdo de Human Review, dado que o repositório é público?",
     "what": "O repositório histudyoficial-crypto/desmentindo é público e espelhado no GitHub Pages. Tudo em control/ e reports/ fica legível por qualquer pessoa.",
     "why_decision": "Revisões editoriais carregam alegações ainda não verificadas sobre pessoas públicas. Publicá-las antes do Human Gate contradiz o próprio gate.",
     "impact": "Enquanto não houver decisão, a fila só pode guardar resumos mínimos e links. Revisões com conteúdo completo ficam bloqueadas.",
     "evidence": [
      "operations/config/operations.json#repo_visibility",
      "https://github.com/histudyoficial-crypto/desmentindo"
     ],
     "possible_actions": [
      "A) Tornar o repo privado e publicar o site só por FTP (desligar o mirror do Pages)",
      "B) Mover control/ e reports/ para um repositório privado de operações",
      "C) Manter público com a regra 'somente resumo + link para o Vault'"
     ],
     "action_url": "https://github.com/histudyoficial-crypto/desmentindo/issues/new?labels=human-gate&title=%5BDECISION%5D%20DQ-0001%20visibilidade%20do%20Control%20Plane",
     "status": "OPEN",
     "created_at": "2026-09-30T18:05:00Z",
     "resolved_at": null,
     "resolution": null
    },
    {
     "item_id": "DQ-0002",
     "kind": "PR_APPROVAL",
     "priority": "P1",
     "title": "Revisar e fazer merge do PR do Control Plane + Command Center v1",
     "what": "Branch claude/sweet-ritchie-s2sfuu: control/, operations/, reports/, command-center/, CLAUDE.md, CI de validação e exclusões no deploy FTP.",
     "why_decision": "Merge em main dispara o deploy Locaweb. O PR exclui as pastas internas do FTP, mas a mudança no workflow de deploy precisa de aprovação humana.",
     "impact": "Sem merge, as rotinas manuais podem rodar na branch, mas main não tem o Control Plane.",
     "evidence": [
      ".github/workflows/deploy-locaweb.yml",
      ".github/workflows/control-plane-validate.yml"
     ],
     "possible_actions": [
      "APPROVE (merge)",
      "REQUEST CHANGES",
      "HOLD"
     ],
     "action_url": "https://github.com/histudyoficial-crypto/desmentindo/pulls",
     "status": "OPEN",
     "created_at": "2026-09-30T18:05:00Z",
     "resolved_at": null,
     "resolution": null
    },
    {
     "item_id": "DQ-0003",
     "kind": "PRODUCT_DECISION",
     "priority": "P1",
     "title": "Confirmar janelas de MORNING / AFTERNOON / EVENING",
     "what": "Janelas propostas (America/Sao_Paulo): 07:00, 14:00, 21:00. Estado PROPOSED; nenhum schedule ativo.",
     "why_decision": "Define o next_run e, depois do ciclo manual, os crons do GitHub Actions.",
     "impact": "Sem confirmação, next_run fica MANUAL.",
     "evidence": [
      "operations/config/operations.json#routines"
     ],
     "possible_actions": [
      "APPROVE",
      "REQUEST CHANGES (informar horários)"
     ],
     "action_url": "https://github.com/histudyoficial-crypto/desmentindo/issues/new?labels=human-gate&title=%5BDECISION%5D%20DQ-0003%20janelas%20das%20rotinas",
     "status": "OPEN",
     "created_at": "2026-09-30T18:05:00Z",
     "resolved_at": null,
     "resolution": null
    }
   ]
  },
  "PIPELINE_TODAY.json": {
   "schema": "desmentindo.control.pipeline.v1",
   "operational_date": "2026-09-30",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "metric_states": [
    "MEASURED",
    "UNKNOWN",
    "NOT_EXECUTED",
    "NOT_AVAILABLE",
    "NOT_CONFIGURED",
    "QUERY_UNAVAILABLE",
    "FAILED"
   ],
   "rule": "value só pode ser número quando state=MEASURED. MEASURED com value=0 é zero real.",
   "stages": [
    {
     "stage": "NEWS_HUB",
     "label": "News Hub",
     "value": null,
     "state": "NOT_EXECUTED",
     "source": null,
     "note": "Rotina do dia ainda não executada via Claude Code."
    },
    {
     "stage": "EVENTS",
     "label": "Eventos",
     "value": null,
     "state": "NOT_EXECUTED",
     "source": null,
     "note": null
    },
    {
     "stage": "RELEVANCE",
     "label": "Relevância",
     "value": null,
     "state": "NOT_EXECUTED",
     "source": null,
     "note": null
    },
    {
     "stage": "CLAIMS",
     "label": "Alegações",
     "value": null,
     "state": "NOT_EXECUTED",
     "source": null,
     "note": "EXTRACTED_STATEMENT != AUDIT_CLAIM: contar só AUDIT_CLAIM."
    },
    {
     "stage": "RHR",
     "label": "RHR",
     "value": null,
     "state": "NOT_EXECUTED",
     "source": null,
     "note": "Contar execuções reais; warranted sem execução = NOT_EXECUTED."
    },
    {
     "stage": "EVIDENCE",
     "label": "Evidência",
     "value": null,
     "state": "NOT_EXECUTED",
     "source": null,
     "note": null
    },
    {
     "stage": "DAY_STORY",
     "label": "Day-story",
     "value": null,
     "state": "NOT_AVAILABLE",
     "source": null,
     "note": "DAY-STORIES vivem fora do repositório."
    },
    {
     "stage": "EDITORIAL_CANDIDATE",
     "label": "Candidato editorial",
     "value": null,
     "state": "NOT_EXECUTED",
     "source": null,
     "note": null
    },
    {
     "stage": "HUMAN_REVIEW",
     "label": "Human Review",
     "value": 0,
     "state": "MEASURED",
     "source": "control/HUMAN_REVIEW_QUEUE.json (WAITING_REVIEW)",
     "note": null
    },
    {
     "stage": "PUBLISH",
     "label": "Publicado",
     "value": 0,
     "state": "MEASURED",
     "source": "GitHub PRs publisher/* com merge em 2026-09-30",
     "note": "PUBLISH=OFF para rotinas; Publisher só abre PR."
    }
   ]
  },
  "CORPUS_STATUS.json": {
   "schema": "desmentindo.control.corpus_status.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "principle": "CORPUS_MEMBERSHIP (decisão editorial: a fonte faz parte do corpus) é separado de TECHNICAL_SEARCHABILITY (existe adaptador + dataset consultável). Fonte membro não pesquisável gera QUERY_UNAVAILABLE, nunca NO_MATCH.",
   "unit_of_analysis": "SOURCE. Nenhuma métrica por pessoa. Proibido: person_score, political_score, suspicion_score, wrongdoing_score, controversy_score, person_ranking, person_watchlist.",
   "manifests": {
    "multisource": {
     "path": "data/manifest.0977832fa154.json",
     "build_id": "MS1_20260929T002918Z",
     "generated_at": "2026-09-29T00:29:18Z"
    },
    "acervos": {
     "path": "data/corpus/manifest.json",
     "build_id": "CORPUS_UI_V2_20260929T120500Z",
     "generated_at": "2026-09-29T15:09:56Z",
     "link_count": 1986,
     "case_count": 13
    }
   },
   "sources": [
    {
     "source_id": "youtube:alexandre_garcia",
     "display_name": "Alexandre Garcia",
     "source_type": "youtube_channel",
     "corpus_membership": "MEMBER",
     "technical_searchability": "SEARCHABLE",
     "adapter_health": "HEALTHY",
     "coverage": {
      "indexed": 3701,
      "total": 3701,
      "unit": "videos",
      "pct": 100.0,
      "status": "COMPLETE"
     },
     "freshness": {
      "latest_source_content": "2026-09-24",
      "latest_index": "2026-09-29",
      "state": "MEASURED"
     },
     "rhr": {
      "rhr_warranted": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "rhr_executed": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "occurrences_found": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "no_match": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "query_unavailable": {
       "value": null,
       "state": "NOT_EXECUTED"
      }
     }
    },
    {
     "source_id": "youtube:caio_coppolla",
     "display_name": "Caio Coppolla",
     "source_type": "youtube_channel",
     "corpus_membership": "MEMBER",
     "technical_searchability": "NOT_SEARCHABLE",
     "adapter_health": "NOT_CONFIGURED",
     "coverage": {
      "indexed": 8,
      "total": 553,
      "unit": "videos",
      "pct": 1.4,
      "status": "PARTIAL"
     },
     "freshness": {
      "latest_source_content": null,
      "latest_index": null,
      "state": "NOT_AVAILABLE"
     },
     "rhr": {
      "rhr_warranted": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "rhr_executed": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "occurrences_found": {
       "value": null,
       "state": "QUERY_UNAVAILABLE"
      },
      "no_match": {
       "value": null,
       "state": "QUERY_UNAVAILABLE"
      },
      "query_unavailable": {
       "value": null,
       "state": "NOT_EXECUTED"
      }
     }
    },
    {
     "source_id": "youtube:te_atualizei",
     "display_name": "Te Atualizei",
     "source_type": "youtube_channel",
     "corpus_membership": "MEMBER",
     "technical_searchability": "NOT_SEARCHABLE",
     "adapter_health": "NOT_CONFIGURED",
     "coverage": {
      "indexed": 93,
      "total": 581,
      "unit": "videos",
      "pct": 16.0,
      "status": "PARTIAL"
     },
     "freshness": {
      "latest_source_content": null,
      "latest_index": null,
      "state": "NOT_AVAILABLE"
     },
     "rhr": {
      "rhr_warranted": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "rhr_executed": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "occurrences_found": {
       "value": null,
       "state": "QUERY_UNAVAILABLE"
      },
      "no_match": {
       "value": null,
       "state": "QUERY_UNAVAILABLE"
      },
      "query_unavailable": {
       "value": null,
       "state": "NOT_EXECUTED"
      }
     },
     "notes": "TA E2 não foi reiniciado nesta implementação."
    },
    {
     "source_id": "publication:revista_oeste",
     "display_name": "Revista Oeste",
     "source_type": "publication",
     "corpus_membership": "MEMBER",
     "technical_searchability": "NOT_CONFIGURED",
     "adapter_health": "NOT_CONFIGURED",
     "coverage": {
      "indexed": null,
      "total": null,
      "unit": "articles",
      "pct": null,
      "status": "NOT_AVAILABLE"
     },
     "freshness": {
      "latest_source_content": null,
      "latest_index": null,
      "state": "NOT_AVAILABLE"
     },
     "rhr": {
      "rhr_warranted": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "rhr_executed": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "occurrences_found": {
       "value": null,
       "state": "QUERY_UNAVAILABLE"
      },
      "no_match": {
       "value": null,
       "state": "QUERY_UNAVAILABLE"
      },
      "query_unavailable": {
       "value": null,
       "state": "NOT_EXECUTED"
      }
     },
     "notes": "Aparece como fonte citada no app (index.html), mas não tem entrada no manifest multisource."
    },
    {
     "source_id": "publication:gazeta_do_povo",
     "display_name": "Gazeta do Povo",
     "source_type": "publication",
     "corpus_membership": "MEMBER",
     "technical_searchability": "NOT_CONFIGURED",
     "adapter_health": "NOT_CONFIGURED",
     "coverage": {
      "indexed": null,
      "total": null,
      "unit": "articles",
      "pct": null,
      "status": "NOT_AVAILABLE"
     },
     "freshness": {
      "latest_source_content": null,
      "latest_index": null,
      "state": "NOT_AVAILABLE"
     },
     "rhr": {
      "rhr_warranted": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "rhr_executed": {
       "value": null,
       "state": "NOT_EXECUTED"
      },
      "occurrences_found": {
       "value": null,
       "state": "QUERY_UNAVAILABLE"
      },
      "no_match": {
       "value": null,
       "state": "QUERY_UNAVAILABLE"
      },
      "query_unavailable": {
       "value": null,
       "state": "NOT_EXECUTED"
      }
     },
     "notes": "Aparece como fonte citada no app (index.html), mas não tem entrada no manifest multisource."
    }
   ]
  },
  "RESULTS.json": {
   "schema": "desmentindo.control.results.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "rule": "Nunca fabricar dados. Sem fonte de analytics, state=NOT_CONFIGURED e value=null.",
   "analytics_provider": null,
   "site": [
    {
     "metric": "STORY_COMPLETION",
     "label": "Histórias lidas até o fim",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "SOURCE_CLICK",
     "label": "Cliques em fontes",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "ARCHIVE_SEARCH",
     "label": "Buscas no acervo",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "SHARE",
     "label": "Compartilhamentos",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "SUBSCRIPTION",
     "label": "Assinaturas",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "SUBMISSION",
     "label": "Envios de leitores",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    }
   ],
   "video": [
    {
     "metric": "3_SECOND_RETENTION",
     "label": "Retenção 3s",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "VIDEO_COMPLETION",
     "label": "Vídeo concluído",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "SHARES",
     "label": "Compartilhamentos",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "SITE_CLICKS",
     "label": "Cliques para o site",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    },
    {
     "metric": "ARCHIVE_SEARCH_AFTER_VIDEO",
     "label": "Busca no acervo após vídeo",
     "value": null,
     "state": "NOT_CONFIGURED",
     "period": null,
     "source": null
    }
   ],
   "historical_context_value": {
    "metric": "HISTORICAL_CONTEXT_VALUE",
    "definition": "Proporção de histórias avaliadas em que Corpus/RHR acrescentou contexto histórico editorialmente útil.",
    "method": "DOCUMENTED_HUMAN_EVALUATION",
    "automatic_scoring": false,
    "formula": "count(verdict=USEFUL) / count(verdict in [USEFUL, NOT_USEFUL]); NOT_APPLICABLE fica fora do denominador.",
    "verdicts": [
     "USEFUL",
     "NOT_USEFUL",
     "NOT_APPLICABLE"
    ],
    "evaluations": [],
    "value": null,
    "state": "NOT_EXECUTED",
    "evaluated_count": 0
   }
  },
  "VIDEO_ENGINE.json": {
   "schema": "desmentindo.control.video_engine.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "state": {
    "VISUAL_PILOT_A": "NEEDS_REFINEMENT_ASSETS_ONLY",
    "VOICE_FINAL": "NO",
    "VIDEO_PILOT_READY": "NO",
    "PUBLISH": "OFF"
   },
   "source_of_state": "Estado informado por Johnny/ChatGPT em 2026-09-30. Assets do Video Engine não estão neste repositório.",
   "next_steps": [
    "Refinar assets do VISUAL_PILOT_A",
    "Definir e gravar voz final",
    "Montar piloto e passar por Human Review antes de qualquer publicação"
   ],
   "render_in_this_repo": false
  },
  "ENGINEERING.json": {
   "schema": "desmentindo.control.engineering.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "repository": {
    "full_name": "histudyoficial-crypto/desmentindo",
    "visibility": "PUBLIC",
    "default_branch": "main",
    "head": "a49ea9cbc320a93440d6b60cb10f530c99cdf9fc"
   },
   "stack": "Site estático single-file (index.html, 3,7 MB) + js/ + data/ (JSON versionado por hash). Deploy FTP para Locaweb em push na main. Publisher Python (stdlib) em GitHub Actions.",
   "workflows": [
    {
     "file": ".github/workflows/deploy-locaweb.yml",
     "trigger": "push main + dispatch",
     "state": "ACTIVE",
     "last_conclusion": "success",
     "last_run_at": "2026-09-30T01:17:45Z"
    },
    {
     "file": ".github/workflows/desmentindo-publisher.yml",
     "trigger": "cron hourly + dispatch",
     "state": "ACTIVE",
     "last_conclusion": "success",
     "last_run_at": "2026-09-30T17:17:50Z"
    },
    {
     "file": ".github/workflows/control-plane-validate.yml",
     "trigger": "pull_request + push (paths de controle)",
     "state": "PROPOSED_IN_PR",
     "last_conclusion": null,
     "last_run_at": null
    }
   ],
   "open_prs": {
    "value": 0,
    "state": "MEASURED",
    "as_of": "2026-09-30T18:00:00Z"
   },
   "stale_branches": [
    "automation-publisher-test-20260929",
    "publisher/AUTOMATION-E2E-TEST-001/1 (PR #1 fechado sem merge)"
   ],
   "backlog": [
    {
     "id": "ENG-001",
     "priority": "P1",
     "title": "Deploy usa FTP sem TLS (porta 21)",
     "detail": "deploy-locaweb.yml usa protocol: ftp. A credencial trafega em claro. Migrar para ftps se a Locaweb suportar.",
     "status": "OPEN"
    },
    {
     "id": "ENG-002",
     "priority": "P1",
     "title": "Sonda de disponibilidade do site",
     "detail": "Nenhum check periódico de desmentindo.com.br; SITE fica UNKNOWN. O Publisher só checa após merge.",
     "status": "OPEN"
    },
    {
     "id": "ENG-003",
     "priority": "P2",
     "title": "Actions em Node 20 deprecado",
     "detail": "actions/checkout@v4 e setup-python@v5 emitem aviso de deprecação no runner.",
     "status": "OPEN"
    },
    {
     "id": "ENG-004",
     "priority": "P2",
     "title": "FTP-Deploy-Action fixada por tag, não por SHA",
     "detail": "SamKirkland/FTP-Deploy-Action@v4.3.5: fixar por commit SHA (supply chain).",
     "status": "OPEN"
    },
    {
     "id": "ENG-005",
     "priority": "P2",
     "title": "index.html e desmentindo_local.html duplicados (3,7 MB cada)",
     "detail": "Conteúdo idêntico; ambos são deployados.",
     "status": "OPEN"
    },
    {
     "id": "ENG-006",
     "priority": "P2",
     "title": "automation/ vai para public_html",
     "detail": "O deploy FTP não exclui automation/publisher_runtime.py. Sem segredo no arquivo (repo já é público), mas não precisa estar no servidor web.",
     "status": "OPEN"
    },
    {
     "id": "ENG-007",
     "priority": "P3",
     "title": "Sem testes automatizados do app",
     "detail": "Somente a validação do Control Plane tem CI.",
     "status": "OPEN"
    }
   ]
  },
  "BUSINESS.json": {
   "schema": "desmentindo.control.business.v1",
   "updated_at": "2026-09-30T18:05:00Z",
   "updated_by": "claude-code",
   "line": "DESMENTINDO DATA / B2B",
   "state": "NOT_CONFIGURED",
   "note": "Nenhum dado de negócio no repositório: sem CRM, sem clientes, sem receita registrada. Nada é inferido.",
   "metrics": [
    {
     "metric": "B2B_LEADS",
     "label": "Leads B2B",
     "value": null,
     "state": "NOT_CONFIGURED",
     "source": null
    },
    {
     "metric": "B2B_ACTIVE_CLIENTS",
     "label": "Clientes ativos",
     "value": null,
     "state": "NOT_CONFIGURED",
     "source": null
    },
    {
     "metric": "MRR",
     "label": "Receita recorrente",
     "value": null,
     "state": "NOT_CONFIGURED",
     "source": null
    },
    {
     "metric": "DATA_REQUESTS",
     "label": "Pedidos de dados",
     "value": null,
     "state": "NOT_CONFIGURED",
     "source": null
    }
   ],
   "data_assets": [
    {
     "asset": "Corpus Alexandre Garcia (transcrições indexadas)",
     "size": "3701 vídeos / 35161 itens",
     "state": "SEARCHABLE",
     "source": "data/manifest.0977832fa154.json"
    },
    {
     "asset": "Acervos (links documentais elegíveis)",
     "size": "1986 links / 13 casos",
     "state": "PUBLISHED",
     "source": "data/corpus/manifest.json"
    }
   ],
   "guardrail": "Produtos de dados nunca podem vender perfil, ranking ou watchlist de pessoa. Unidade = EVENT / STORY / CLAIM / DOCUMENT / SOURCE."
  }
 }
};
