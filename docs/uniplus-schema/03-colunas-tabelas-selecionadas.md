# Colunas das tabelas selecionadas — Fase 4 (Uniplus)

# Colunas de "dav" (232 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('dav_id_seq'::regclass) |
| [ ] | codigo | bigint | YES |  |
| [ ] | idfilial | bigint | YES |  |
| [ ] | tipodocumento | smallint | YES |  |
| [ ] | idrepresentante | bigint | YES |  |
| [ ] | idcliente | bigint | YES |  |
| [ ] | status | smallint | YES |  |
| [ ] | valor | numeric | YES |  |
| [ ] | data | date | YES |  |
| [ ] | entrega | timestamp without time zone | YES |  |
| [ ] | idcondicaopagamento | bigint | YES |  |
| [ ] | comissaorepresentante | numeric | YES | 0.00 |
| [ ] | acrescimo | numeric | YES | 0.00 |
| [ ] | desconto | numeric | YES | 0.00 |
| [ ] | observacao | text | YES |  |
| [ ] | idtabelapreco | bigint | YES |  |
| [ ] | idusuario | bigint | YES |  |
| [ ] | idusuariofaturamento | bigint | YES |  |
| [ ] | enderecoentrega | character varying(60) | YES |  |
| [ ] | complementoentrega | character varying(60) | YES |  |
| [ ] | bairroentrega | character varying(50) | YES |  |
| [ ] | idcidadeentrega | bigint | YES |  |
| [ ] | cepentrega | character varying(9) | YES |  |
| [ ] | telefoneentrega | character varying(40) | YES |  |
| [ ] | celularentrega | character varying(40) | YES |  |
| [ ] | cupomemitido | smallint | YES |  |
| [ ] | coo | integer | YES |  |
| [ ] | titulodav | character varying(30) | YES |  |
| [ ] | ecfmodelo | character varying(20) | YES |  |
| [ ] | ecfmarca | character varying(20) | YES |  |
| [ ] | ecfserie | character varying(20) | YES |  |
| [ ] | ecftipo | character varying(7) | YES |  |
| [ ] | ecfmfadicional | character varying(1) | YES |  |
| [ ] | idnotafiscal | bigint | YES |  |
| [ ] | numeroenderecoentrega | character varying(6) | YES |  |
| [ ] | idestadoentrega | bigint | YES |  |
| [ ] | aprovado | smallint | YES | 0 |
| [ ] | validade | date | YES |  |
| [ ] | descontosubtotal | numeric | YES |  |
| [ ] | hash | bigint | YES |  |
| [ ] | pautapreco | smallint | YES |  |
| [ ] | ccf | integer | YES |  |
| [ ] | iddavoriginal | bigint | YES |  |
| [ ] | numeroserie | character varying(30) | YES |  |
| [ ] | marca | character varying(30) | YES |  |
| [ ] | modelo | character varying(30) | YES |  |
| [ ] | anofabricacao | smallint | YES |  |
| [ ] | placa | character varying(10) | YES |  |
| [ ] | renavam | character varying(11) | YES |  |
| [ ] | cooger | integer | YES |  |
| [ ] | idtipodocumentofinanceiro | bigint | YES |  |
| [ ] | pedidocliente | character varying(50) | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | pdv | smallint | YES |  |
| [ ] | pedidoreferenteadiantamento | smallint | YES |  |
| [ ] | idadiantamento | bigint | YES |  |
| [ ] | vendaentregafutura | smallint | YES |  |
| [ ] | vendacomtransferenciafiliais | smallint | YES |  |
| [ ] | statustransferenciafiliais | smallint | YES |  |
| [ ] | statusvendaentregafutura | smallint | YES |  |
| [ ] | dataimportacao | date | YES |  |
| [ ] | impresso | smallint | YES |  |
| [ ] | cnpjcpfcliente | character varying(18) | YES |  |
| [ ] | nomecliente | character varying(60) | YES |  |
| [ ] | valorentrada | numeric | YES |  |
| [ ] | valorprestacao | numeric | YES |  |
| [ ] | numeroparcelas | smallint | YES |  |
| [ ] | plano | character varying(255) | YES |  |
| [ ] | valortotalparcelas | numeric | YES |  |
| [ ] | taxa | numeric | YES |  |
| [ ] | temfinanciamento | smallint | YES |  |
| [ ] | dataprimeirovencimento | date | YES |  |
| [ ] | tipoparcela | smallint | YES |  |
| [ ] | codigotabelafinanciamento | character varying(10) | YES |  |
| [ ] | pedidoseraentregue | smallint | YES |  |
| [ ] | vendaseraretirada | smallint | YES |  |
| [ ] | statuscarga | smallint | YES |  |
| [ ] | statusretirada | smallint | YES |  |
| [ ] | tipofrete | smallint | YES |  |
| [ ] | valorfrete | numeric | YES |  |
| [ ] | idtransportadora | bigint | YES |  |
| [ ] | avista | numeric | YES |  |
| [ ] | aprazo | numeric | YES |  |
| [ ] | dinheiro | numeric | YES |  |
| [ ] | cheque | numeric | YES |  |
| [ ] | devolucao | numeric | YES |  |
| [ ] | outros | numeric | YES |  |
| [ ] | identificacao | character varying(20) | YES |  |
| [ ] | incluidoporcliente | smallint | YES |  |
| [ ] | cnpjfilial | character varying(18) | YES |  |
| [ ] | idoperacaofiscal | bigint | YES |  |
| [ ] | codigoecommerce | character varying(50) | YES |  |
| [ ] | iddavgerada | bigint | YES |  |
| [ ] | idcfop | bigint | YES |  |
| [ ] | idtipopedido | bigint | YES |  |
| [ ] | baseicms | numeric | YES |  |
| [ ] | icms | numeric | YES |  |
| [ ] | baseicmssubstituicao | numeric | YES |  |
| [ ] | icmssubstituicao | numeric | YES |  |
| [ ] | pis | numeric | YES |  |
| [ ] | cofins | numeric | YES |  |
| [ ] | ipi | numeric | YES |  |
| [ ] | percentualdescontosubtotal | numeric | YES |  |
| [ ] | codigomobile | character varying(36) | YES |  |
| [ ] | idoperacao | bigint | YES |  |
| [ ] | iddavmesclada | bigint | YES |  |
| [ ] | tipopessoa | smallint | YES |  |
| [ ] | inscricaoestadual | character varying(20) | YES |  |
| [ ] | idusuariodescontofin | bigint | YES |  |
| [ ] | idtabelafinanciamento | bigint | YES |  |
| [ ] | idtabelafinanciamentoparcela | bigint | YES |  |
| [ ] | idtabelafinanparcelacond | bigint | YES |  |
| [ ] | valorentradaoriginal | numeric | YES |  |
| [ ] | valorprestacaooriginal | numeric | YES |  |
| [ ] | valortotalparcelasoriginal | numeric | YES |  |
| [ ] | valoracrescimo | numeric | YES |  |
| [ ] | valordesconto | numeric | YES |  |
| [ ] | valordescontousuario | numeric | YES |  |
| [ ] | diferencafianciamento | numeric | YES |  |
| [ ] | tipovenda | smallint | YES |  |
| [ ] | posavista | numeric | YES |  |
| [ ] | posaprazo | numeric | YES |  |
| [ ] | valortotalfinanceiro | numeric | YES |  |
| [ ] | numerocheque | character varying(20) | YES |  |
| [ ] | vencimentocheque | date | YES |  |
| [ ] | idbancocheque | bigint | YES |  |
| [ ] | agenciabancocheque | character varying(10) | YES |  |
| [ ] | numerocontacorrentebancocheque | character varying(10) | YES |  |
| [ ] | cpfcnpjemitentecheque | character varying(20) | YES |  |
| [ ] | nomeemitentecheque | character varying(60) | YES |  |
| [ ] | conferido | smallint | YES |  |
| [ ] | extra1 | character varying(512) | YES |  |
| [ ] | extra2 | character varying(512) | YES |  |
| [ ] | extra3 | character varying(512) | YES |  |
| [ ] | extra4 | character varying(512) | YES |  |
| [ ] | extra5 | character varying(512) | YES |  |
| [ ] | extra6 | character varying(512) | YES |  |
| [ ] | extra7 | character varying(512) | YES |  |
| [ ] | extra8 | character varying(512) | YES |  |
| [ ] | extra9 | character varying(512) | YES |  |
| [ ] | extra10 | character varying(512) | YES |  |
| [ ] | assinatura | bytea | YES |  |
| [ ] | datahoraimpressao | timestamp without time zone | YES |  |
| [ ] | datacancelamento | date | YES |  |
| [ ] | idusuariocancelamento | bigint | YES |  |
| [ ] | icmsfundopobrezast | numeric | YES |  |
| [ ] | icmsfundopobrezainterno | numeric | YES |  |
| [ ] | idrepresentante2 | bigint | YES |  |
| [ ] | datapedidomobile | timestamp without time zone | YES |  |
| [ ] | codigoorigemecommerce | character varying(50) | YES |  |
| [ ] | statusecommerce | character varying(50) | YES |  |
| [ ] | identidaderemessaecommerce | bigint | YES |  |
| [ ] | idtranspremessaecommerce | bigint | YES |  |
| [ ] | idnotavendaecomerce | bigint | YES |  |
| [ ] | idnotaressaecomerce | bigint | YES |  |
| [ ] | tipopedidoecommerce | character varying(50) | YES |  |
| [ ] | objnotaecommerce | text | YES |  |
| [ ] | idconfiguracaoecommerce | bigint | YES |  |
| [ ] | tipocompra | smallint | YES | 0 |
| [ ] | idroteirovendedor | bigint | YES |  |
| [ ] | idlocalestoque | bigint | YES |  |
| [ ] | dataalteracao | timestamp without time zone | YES |  |
| [ ] | datainclusao | timestamp without time zone | YES |  |
| [ ] | enderecotransportadora | character varying(50) | YES |  |
| [ ] | numeroenderecotransportadora | character varying(6) | YES |  |
| [ ] | idestadotransportadora | bigint | YES |  |
| [ ] | idcidadetransportadora | bigint | YES |  |
| [ ] | cnpjcpftransportadora | character varying(18) | YES |  |
| [ ] | ietransportadora | character varying(20) | YES |  |
| [ ] | placaveiculotransportadora | character varying(8) | YES |  |
| [ ] | idestadoveiculotransportadora | bigint | YES |  |
| [ ] | quantidadetransportadora | numeric | YES |  |
| [ ] | pesobrutotransportadora | numeric | YES |  |
| [ ] | pesoliquidotransportadora | numeric | YES |  |
| [ ] | especietransportadora | character varying(60) | YES |  |
| [ ] | marcatransportadora | character varying(60) | YES |  |
| [ ] | numerotransportadora | character varying(60) | YES |  |
| [ ] | longitudeentrega | numeric | YES |  |
| [ ] | latitudeentrega | numeric | YES |  |
| [ ] | identregamercadolivre | bigint | YES |  |
| [ ] | idcarrinhocompras | bigint | YES |  |
| [ ] | idformaentregaregiao | bigint | YES |  |
| [ ] | idnfce | bigint | YES |  |
| [ ] | idfinalizador | bigint | YES |  |
| [ ] | deposito | numeric | YES |  |
| [ ] | pix | numeric | YES |  |
| [ ] | carteiradigital | numeric | YES |  |
| [ ] | idcontacorrentedeposito | bigint | YES |  |
| [ ] | idcontacorrentepix | bigint | YES |  |
| [ ] | idadmcarteiradigital | bigint | YES |  |
| [ ] | idcupomshop | bigint | YES |  |
| [ ] | idtransacaofinanceira | bigint | YES |  |
| [ ] | trocoshop | numeric | YES |  |
| [ ] | datahoradespacho | timestamp without time zone | YES |  |
| [ ] | datahorarecebimento | timestamp without time zone | YES |  |
| [ ] | datahorafaturamento | timestamp without time zone | YES |  |
| [ ] | codigorastreio | character varying(200) | YES |  |
| [ ] | hashpafnfce | bigint | YES |  |
| [ ] | idusuarioconferencia | bigint | YES |  |
| [ ] | pedidoclientexped | character varying(60) | YES |  |
| [ ] | despachomelhorenvio | smallint | YES | 0 |
| [ ] | urlrastreio | character varying(200) | YES |  |
| [ ] | idlocalretirada | bigint | YES |  |
| [ ] | idlocalretiradanf | bigint | YES |  |
| [ ] | tipopessoaentrega | smallint | YES |  |
| [ ] | cnpjcpfentrega | character varying(20) | YES |  |
| [ ] | nomerazaosocialentrega | character varying(50) | YES |  |
| [ ] | emailentrega | character varying(60) | YES |  |
| [ ] | idusuarioliberouatraso | bigint | YES |  |
| [ ] | idusuarioliberoulimite | bigint | YES |  |
| [ ] | idrastreioecommerce | bigint | YES |  |
| [ ] | jsonpedidoecommerce | text | YES |  |
| [ ] | acrescimosubtotal | numeric | YES |  |
| [ ] | uniplusshop | smallint | YES |  |
| [ ] | dataconferencia | timestamp without time zone | YES |  |
| [ ] | statusconferencia | smallint | YES |  |
| [ ] | valortarifavendaecommerce | numeric | YES |  |
| [ ] | outrasdespesas | numeric | YES |  |
| [ ] | idstatuspedidoecommerce | smallint | YES |  |
| [ ] | rastreioenviado | smallint | YES |  |
| [ ] | servicorastreio | character varying(200) | YES |  |
| [ ] | outrosparcelamentos | numeric | YES |  |
| [ ] | codigoautorizacaopix | character varying(128) | YES |  |
| [ ] | codigoprepostagemcorreio | character varying(200) | YES |  |
| [ ] | jsonprepostagemcorreio | text | YES |  |
| [ ] | codigoobjetoprepostagem | character varying(15) | YES |  |
| [ ] | codigorotuloprepostagem | character varying(200) | YES |  |
| [ ] | etiquetaprepostagem | bytea | YES |  |
| [ ] | origemrequisicao | smallint | YES |  |
| [ ] | idusuarioestornoconferencia | bigint | YES |  |
| [ ] | codigonotaecommerce | character varying(200) | YES |  |
| [ ] | declaracaoprepostagem | bytea | YES |  |

# Colunas de "davitem" (285 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('davitem_id_seq'::regclass) |
| [ ] | iddav | bigint | YES |  |
| [ ] | contador | smallint | YES |  |
| [ ] | quantidade | numeric | YES | 0.000 |
| [ ] | preco | numeric | YES |  |
| [ ] | idproduto | bigint | YES |  |
| [ ] | total | numeric | YES |  |
| [ ] | valorcomissao | numeric | YES | 0.00 |
| [ ] | desconto | numeric | YES | 0.00 |
| [ ] | idmotivodesconto | bigint | YES |  |
| [ ] | observacao | character varying(20) | YES |  |
| [ ] | variacoes | character varying(4096) | YES |  |
| [ ] | numeroserie | character varying(40) | YES |  |
| [ ] | brinde | smallint | YES |  |
| [ ] | percentualdesconto | numeric | YES |  |
| [ ] | descontopromocao | numeric | YES |  |
| [ ] | idpromocao | bigint | YES |  |
| [ ] | tipokit | smallint | YES | 0 |
| [ ] | idprodutokit | bigint | YES |  |
| [ ] | cancelado | smallint | YES |  |
| [ ] | descontoclienteprodutoaplicado | smallint | YES |  |
| [ ] | descontosubtotal | numeric | YES |  |
| [ ] | precooriginal | numeric | YES |  |
| [ ] | numeropedidocliente | character varying(20) | YES |  |
| [ ] | idusuariodesconto | bigint | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | acrescimo | numeric | YES |  |
| [ ] | localretiradaitem | smallint | YES |  |
| [ ] | datahoraretirada | timestamp without time zone | YES |  |
| [ ] | idusuarioretirada | bigint | YES |  |
| [ ] | idfilialretirada | bigint | YES |  |
| [ ] | vendaentregafutura | smallint | YES |  |
| [ ] | datainclusao | date | YES |  |
| [ ] | codigoproduto | character varying(20) | YES |  |
| [ ] | nomeproduto | character varying(120) | YES |  |
| [ ] | unidademedida | character varying(6) | YES |  |
| [ ] | codigototalizadorparcial | character varying(7) | YES |  |
| [ ] | codigodav | bigint | YES |  |
| [ ] | hash | bigint | YES |  |
| [ ] | idunidademedida | bigint | YES |  |
| [ ] | fatorconversao | numeric | YES |  |
| [ ] | idembalagem | bigint | YES |  |
| [ ] | pautapreco | smallint | YES |  |
| [ ] | tiporetiradaentregaitem | smallint | YES |  |
| [ ] | tipoentrega | smallint | YES |  |
| [ ] | complementoitem | character varying(70) | YES |  |
| [ ] | fabricantedispenser | smallint | YES |  |
| [ ] | codigoorcamentodispenser | character varying(16) | YES |  |
| [ ] | codigogrupodispenser | character varying(16) | YES |  |
| [ ] | codigoprodutodispenser | character varying(16) | YES |  |
| [ ] | codigobasedispenser | character varying(16) | YES |  |
| [ ] | codigoembalagemdispenser | character varying(16) | YES |  |
| [ ] | codigocordispenser | character varying(16) | YES |  |
| [ ] | informacaoadicional | character varying(500) | YES |  |
| [ ] | tipovalordesconto | smallint | YES |  |
| [ ] | idapontamentoproducaodispenser | bigint | YES |  |
| [ ] | iditemkitpai | bigint | YES |  |
| [ ] | situacaotributaria | character varying(7) | YES |  |
| [ ] | aliquota | numeric | YES |  |
| [ ] | idlote | bigint | YES |  |
| [ ] | dataorcamentodispenser | date | YES |  |
| [ ] | idprodutobrindepai | bigint | YES |  |
| [ ] | precominimovenda | numeric | YES |  |
| [ ] | idsupervisorvenda | bigint | YES |  |
| [ ] | comprimento | numeric | YES |  |
| [ ] | largura | numeric | YES |  |
| [ ] | altura | numeric | YES |  |
| [ ] | tipotinta | smallint | YES |  |
| [ ] | idprodutobase | bigint | YES |  |
| [ ] | quantidadepeca | bigint | YES |  |
| [ ] | decimaisquantidade | smallint | YES |  |
| [ ] | decimaispreco | smallint | YES |  |
| [ ] | idreserva | bigint | YES |  |
| [ ] | modalidadeicmsst | smallint | YES |  |
| [ ] | situacaotributariasn | character varying(3) | YES |  |
| [ ] | tributacao | character varying(7) | YES |  |
| [ ] | ipi | numeric | YES |  |
| [ ] | percentualreducaomva | numeric | YES |  |
| [ ] | idcfop | bigint | YES |  |
| [ ] | basepis | numeric | YES |  |
| [ ] | basecofins | numeric | YES |  |
| [ ] | aliquotapis | numeric | YES |  |
| [ ] | aliquotacofins | numeric | YES |  |
| [ ] | pis | numeric | YES |  |
| [ ] | cofins | numeric | YES |  |
| [ ] | cstpis | character varying(2) | YES |  |
| [ ] | cstcofins | character varying(2) | YES |  |
| [ ] | idtipocredito | bigint | YES |  |
| [ ] | idreceitasemcontribuicao | bigint | YES |  |
| [ ] | idcontribuicaosocialapurada | bigint | YES |  |
| [ ] | idcontribuicaosocialapurcofins | bigint | YES |  |
| [ ] | situacaotributariaipi | character varying(3) | YES |  |
| [ ] | modocalculoipi | smallint | YES |  |
| [ ] | baseipi | numeric | YES |  |
| [ ] | percentualipi | numeric | YES |  |
| [ ] | percentualipinaodestacado | numeric | YES |  |
| [ ] | ipinaodestacado | numeric | YES |  |
| [ ] | percentualreducaoicms | numeric | YES |  |
| [ ] | baseicms | numeric | YES |  |
| [ ] | percentualicms | numeric | YES |  |
| [ ] | icms | numeric | YES |  |
| [ ] | percentualicmsaproveitamento | numeric | YES |  |
| [ ] | valoricmsaproveitamento | numeric | YES |  |
| [ ] | percentualicmsdiferido | numeric | YES |  |
| [ ] | icmsdiferido | numeric | YES |  |
| [ ] | percentualreducaoicmsdiferido | numeric | YES |  |
| [ ] | baseicmsdiferido | numeric | YES |  |
| [ ] | percentualicmssubstituicao | numeric | YES |  |
| [ ] | percreducaoicmssubstituicao | numeric | YES |  |
| [ ] | margemvaloradicionado | numeric | YES |  |
| [ ] | baseicmssubstituicao | numeric | YES |  |
| [ ] | icmssubstituicao | numeric | YES |  |
| [ ] | baseicmsstanterior | numeric | YES |  |
| [ ] | valoricmsstanterior | numeric | YES |  |
| [ ] | percentualfunrural | numeric | YES |  |
| [ ] | funrural | numeric | YES |  |
| [ ] | percimpostoaproximado | numeric | YES |  |
| [ ] | baseimpostoaproximado | numeric | YES |  |
| [ ] | chaveibpt | character varying(6) | YES |  |
| [ ] | percimpostoaproximadomunicipal | numeric | YES |  |
| [ ] | impostoaproximadomunicipal | numeric | YES |  |
| [ ] | percimpostoaproximadoestadual | numeric | YES |  |
| [ ] | impostoaproximadoestadual | numeric | YES |  |
| [ ] | percimpostoaproximadofederal | numeric | YES |  |
| [ ] | impostoaproximadofederal | numeric | YES |  |
| [ ] | fonteibpt | character varying(50) | YES |  |
| [ ] | impostoaproximado | numeric | YES |  |
| [ ] | valorimpostosincentivados | numeric | YES |  |
| [ ] | valorpisincentivado | numeric | YES |  |
| [ ] | valorcofinsincentivado | numeric | YES |  |
| [ ] | valoricmsincentivado | numeric | YES |  |
| [ ] | aliquotapisincentivado | numeric | YES |  |
| [ ] | aliquotacofinsincentivado | numeric | YES |  |
| [ ] | aliquotaicmsincentivado | numeric | YES |  |
| [ ] | percentualiss | numeric | YES |  |
| [ ] | baseiss | numeric | YES |  |
| [ ] | percentualreducaoiss | numeric | YES |  |
| [ ] | iss | numeric | YES |  |
| [ ] | percentualretencaoiss | numeric | YES |  |
| [ ] | retencaoiss | numeric | YES |  |
| [ ] | perccontribuicaosocial | numeric | YES |  |
| [ ] | contribuicaosocial | numeric | YES |  |
| [ ] | percimpostorenda | numeric | YES |  |
| [ ] | impostorenda | numeric | YES |  |
| [ ] | percinss | numeric | YES |  |
| [ ] | inss | numeric | YES |  |
| [ ] | frete | numeric | YES |  |
| [ ] | seguro | numeric | YES |  |
| [ ] | outrasdespesas | numeric | YES |  |
| [ ] | impostoimportacao | numeric | YES |  |
| [ ] | despesasaduaneiras | numeric | YES |  |
| [ ] | iof | numeric | YES |  |
| [ ] | veiculonovo | smallint | YES |  |
| [ ] | tipovaloricms | smallint | YES |  |
| [ ] | tipovaloripi | smallint | YES |  |
| [ ] | naoconsiderarvalortotalnota | smallint | YES |  |
| [ ] | taxasiscomex | numeric | YES |  |
| [ ] | baseimpostoimportacao | numeric | YES |  |
| [ ] | enviartagsdiferimentototal | smallint | YES |  |
| [ ] | motivodesoneracaoicms | smallint | YES |  |
| [ ] | motivodesoneracaopis | smallint | YES |  |
| [ ] | motivodesoneracaocofins | smallint | YES |  |
| [ ] | origem | smallint | YES |  |
| [ ] | percentualicmsdestino | numeric | YES |  |
| [ ] | percentualicmsinterestadual | numeric | YES |  |
| [ ] | percentualpartilhaicmsestados | numeric | YES |  |
| [ ] | icmsdestino | numeric | YES |  |
| [ ] | icmsremetente | numeric | YES |  |
| [ ] | percentualicmsfundopobreza | numeric | YES |  |
| [ ] | icmsfundopobreza | numeric | YES |  |
| [ ] | basecalculoicmsdifal | numeric | YES |  |
| [ ] | idenquadramentoipi | bigint | YES |  |
| [ ] | numeropedidocompra | character varying(15) | YES |  |
| [ ] | numeroitempedidocompra | character varying(6) | YES |  |
| [ ] | idtabelafinanciamento | bigint | YES |  |
| [ ] | idtabelafinanciamentoprazo | bigint | YES |  |
| [ ] | idpromocaoprazo | bigint | YES |  |
| [ ] | naopossuiicmsstnotaorigem | smallint | YES |  |
| [ ] | baseimpostorenda | numeric | YES |  |
| [ ] | basecontribuicaosocial | numeric | YES |  |
| [ ] | baseinss | numeric | YES |  |
| [ ] | valordiferencaimportacaoxml | numeric | YES |  |
| [ ] | idflex | bigint | YES |  |
| [ ] | valorflex | numeric | YES |  |
| [ ] | valorpauta | numeric | YES |  |
| [ ] | aliquotapisretido | numeric | YES |  |
| [ ] | aliquotacofinsretido | numeric | YES |  |
| [ ] | basepisretido | numeric | YES |  |
| [ ] | basecofinsretido | numeric | YES |  |
| [ ] | pisretido | numeric | YES |  |
| [ ] | cofinsretido | numeric | YES |  |
| [ ] | idlocalestoque | bigint | YES |  |
| [ ] | chavenferecebidaexportacao | character varying(44) | YES |  |
| [ ] | valoricmsdiferencialentrada | numeric | YES |  |
| [ ] | aliquotaicmsdiferencialentrada | numeric | YES |  |
| [ ] | idobservacaolancamentofiscal | bigint | YES |  |
| [ ] | idajustedocumentofiscal | bigint | YES |  |
| [ ] | cargatributariamedia | numeric | YES |  |
| [ ] | idembalagemtributavel | bigint | YES |  |
| [ ] | idunidademedidatributavel | bigint | YES |  |
| [ ] | quantidadetributavel | numeric | YES |  |
| [ ] | percredbasepiscofins | numeric | YES |  |
| [ ] | basefundopobrezast | numeric | YES |  |
| [ ] | percentualicmsfundopobrezast | numeric | YES |  |
| [ ] | icmsfundopobrezast | numeric | YES |  |
| [ ] | basefundopobrezainterno | numeric | YES |  |
| [ ] | percicmsfundopobrezainterno | numeric | YES |  |
| [ ] | icmsfundopobrezainterno | numeric | YES |  |
| [ ] | basefcpstanterior | numeric | YES |  |
| [ ] | valorfcpstanterior | numeric | YES |  |
| [ ] | valorafrmm | numeric | YES |  |
| [ ] | basestufdestino | numeric | YES |  |
| [ ] | valorstufdestino | numeric | YES |  |
| [ ] | iditemecommerce | character varying(50) | YES |  |
| [ ] | baseicmsefetivo | numeric | YES |  |
| [ ] | aliquotaicmsefetivo | numeric | YES |  |
| [ ] | percentualredbaseicmsefetivo | numeric | YES |  |
| [ ] | valoricmsefetivo | numeric | YES |  |
| [ ] | aliquotafcpstanterior | numeric | YES |  |
| [ ] | aliquotaicmsstanterior | numeric | YES |  |
| [ ] | valoricmssubstituto | numeric | YES |  |
| [ ] | motivodesoneracaoicmssemdesc | smallint | YES |  |
| [ ] | baseicmsdesoneradosemdesconto | numeric | YES |  |
| [ ] | aliquotaicmsdesoneradosemdesc | numeric | YES |  |
| [ ] | valoricmsdesoneradosemdesconto | numeric | YES |  |
| [ ] | aliquotareducaobasecalculoinss | numeric | YES |  |
| [ ] | identidadedesconto | bigint | YES |  |
| [ ] | baseicmsstpresumido | numeric | YES |  |
| [ ] | aliquotaicmsstpresumido | numeric | YES |  |
| [ ] | valoricmsstpresumido | numeric | YES |  |
| [ ] | baseicmspresumido | numeric | YES |  |
| [ ] | aliquotaicmspresumido | numeric | YES |  |
| [ ] | valoricmspresumido | numeric | YES |  |
| [ ] | tipoprodutoespecifico | smallint | YES |  |
| [ ] | tipoarma | smallint | YES |  |
| [ ] | numeroseriearma | character varying(15) | YES |  |
| [ ] | numeroseriecanoarma | character varying(15) | YES |  |
| [ ] | descricaoarma | character varying(256) | YES |  |
| [ ] | percentualreducaoicmsvirtual | numeric | YES |  |
| [ ] | baseicmsvirtual | numeric | YES |  |
| [ ] | percentualicmsvirtual | numeric | YES |  |
| [ ] | icmsvirtual | numeric | YES |  |
| [ ] | basefundopobrezainternovirtual | numeric | YES |  |
| [ ] | percicmsfundopobinternovirtual | numeric | YES |  |
| [ ] | icmsfundopobrezainternovirtual | numeric | YES |  |
| [ ] | descontoalteracao | numeric | YES |  |
| [ ] | acrescimoalteracao | numeric | YES |  |
| [ ] | hashpafnfce | bigint | YES |  |
| [ ] | deducaoicmsbasepis | numeric | YES |  |
| [ ] | deducaoicmsbasecofins | numeric | YES |  |
| [ ] | numerolote | character varying(30) | YES |  |
| [ ] | fabricacaolote | date | YES |  |
| [ ] | vencimentolote | date | YES |  |
| [ ] | codigoanvisa | character varying(13) | YES |  |
| [ ] | motivoisencaocodigoanvisa | character varying(255) | YES |  |
| [ ] | precomaximoconsumidor | numeric | YES |  |
| [ ] | acrescimosubtotal | numeric | YES |  |
| [ ] | baseicmsmonoproprio | numeric | YES |  |
| [ ] | aliquotaicmsmonoproprio | numeric | YES |  |
| [ ] | valoricmsmonoproprio | numeric | YES |  |
| [ ] | baseicmsmonoretencao | numeric | YES |  |
| [ ] | aliquotaicmsmonoretencao | numeric | YES |  |
| [ ] | valoricmsmonoretencao | numeric | YES |  |
| [ ] | baseicmsmonodiferido | numeric | YES |  |
| [ ] | aliquotaicmsmonodiferido | numeric | YES |  |
| [ ] | valoricmsmonodiferido | numeric | YES |  |
| [ ] | baseicmsmonoretanterior | numeric | YES |  |
| [ ] | aliquotaicmsmonoretanterior | numeric | YES |  |
| [ ] | valoricmsmonoretanterior | numeric | YES |  |
| [ ] | valortarifavendaecommerce | numeric | YES |  |
| [ ] | idlocalestoqueretirada | bigint | YES |  |
| [ ] | tipo | character(1) | YES |  |
| [ ] | tributacaoissnacional | character varying(1) | YES |  |
| [ ] | numerobeneficioissnacional | character varying(14) | YES |  |
| [ ] | tiposuspensaoissnacional | character varying(1) | YES |  |
| [ ] | tipoimunidadeissnacional | character varying(1) | YES |  |
| [ ] | tiporetencaoissnacional | character varying(1) | YES |  |
| [ ] | numeroprocessoissnacional | character varying(30) | YES |  |
| [ ] | flexecommerce | numeric | YES |  |
| [ ] | baseicmspresumidonfe | numeric | YES |  |
| [ ] | aliquotaicmspresumidonfe | numeric | YES |  |
| [ ] | valoricmspresumidonfe | numeric | YES |  |
| [ ] | percfcpinternodiferido | numeric | YES |  |
| [ ] | valorfcpinternodiferido | numeric | YES |  |
| [ ] | valorfcpinternosemdif | numeric | YES |  |

# Colunas de "entidade" (275 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('entidade_id_seq'::regclass) |
| [ ] | codigo | character varying(14) | YES |  |
| [ ] | cliente | smallint | YES |  |
| [ ] | fornecedor | smallint | YES |  |
| [ ] | transportadora | smallint | YES |  |
| [ ] | representante | smallint | YES |  |
| [ ] | idrepresentante | bigint | YES |  |
| [ ] | idtabelapreco | bigint | YES |  |
| [ ] | idcondicaopagamento | bigint | YES |  |
| [ ] | idformapagamento | bigint | YES |  |
| [ ] | nome | character varying(60) | YES |  |
| [ ] | razaosocial | character varying(60) | YES |  |
| [ ] | tipopessoa | smallint | YES |  |
| [ ] | cnpjcpf | character varying(20) | YES |  |
| [ ] | inscricaoestadual | character varying(20) | YES |  |
| [ ] | rg | character varying(20) | YES |  |
| [ ] | endereco | character varying(60) | YES |  |
| [ ] | numeroendereco | character varying(6) | YES |  |
| [ ] | complemento | character varying(50) | YES |  |
| [ ] | bairro | character varying(50) | YES |  |
| [ ] | idestado | bigint | YES |  |
| [ ] | idcidade | bigint | YES |  |
| [ ] | cep | character varying(9) | YES |  |
| [ ] | telefone | character varying(40) | YES |  |
| [ ] | celular | character varying(40) | YES |  |
| [ ] | fax | character varying(40) | YES |  |
| [ ] | email | character varying(200) | YES |  |
| [ ] | nascimento | date | YES |  |
| [ ] | limitecredito | numeric | YES |  |
| [ ] | creditorestrito | smallint | YES | 0 |
| [ ] | nomecontato | character varying(50) | YES |  |
| [ ] | nascimentocontato | date | YES |  |
| [ ] | telefonecontato | character varying(40) | YES |  |
| [ ] | nomecontatoentrega | character varying(50) | YES |  |
| [ ] | nascimentocontatoentrega | date | YES |  |
| [ ] | enderecoentrega | character varying(60) | YES |  |
| [ ] | numeroenderecoentrega | character varying(6) | YES |  |
| [ ] | complementoentrega | character varying(60) | YES |  |
| [ ] | bairroentrega | character varying(50) | YES |  |
| [ ] | idcidadeentrega | bigint | YES |  |
| [ ] | cepentrega | character varying(9) | YES |  |
| [ ] | telefoneentrega | character varying(40) | YES |  |
| [ ] | celularentrega | character varying(40) | YES |  |
| [ ] | faxentrega | character varying(40) | YES |  |
| [ ] | emailentrega | character varying(200) | YES |  |
| [ ] | nomecontatocobranca | character varying(50) | YES |  |
| [ ] | nascimentocontatocobranca | date | YES |  |
| [ ] | enderecocobranca | character varying(60) | YES |  |
| [ ] | numeroenderecocobranca | character varying(6) | YES |  |
| [ ] | complementocobranca | character varying(50) | YES |  |
| [ ] | bairrocobranca | character varying(50) | YES |  |
| [ ] | idcidadecobranca | bigint | YES |  |
| [ ] | cepcobranca | character varying(9) | YES |  |
| [ ] | telefonecobranca | character varying(40) | YES |  |
| [ ] | celularcobranca | character varying(40) | YES |  |
| [ ] | faxcobranca | character varying(40) | YES |  |
| [ ] | emailcobranca | character varying(200) | YES |  |
| [ ] | idplanocontas | bigint | YES |  |
| [ ] | comissao | numeric | YES |  |
| [ ] | extra1 | character varying(512) | YES |  |
| [ ] | extra2 | character varying(512) | YES |  |
| [ ] | extra3 | character varying(512) | YES |  |
| [ ] | extra4 | character varying(512) | YES |  |
| [ ] | extra5 | character varying(512) | YES |  |
| [ ] | extra6 | character varying(512) | YES |  |
| [ ] | observacao | text | YES |  |
| [ ] | idcidadenatural | bigint | YES |  |
| [ ] | estadocivil | smallint | YES |  |
| [ ] | conjuge | character varying(50) | YES |  |
| [ ] | pai | character varying(50) | YES |  |
| [ ] | mae | character varying(50) | YES |  |
| [ ] | profissao | character varying(50) | YES |  |
| [ ] | localtrabalho | character varying(50) | YES |  |
| [ ] | enderecotrabalho | character varying(60) | YES |  |
| [ ] | numeroenderecotrabalho | character varying(6) | YES |  |
| [ ] | complementotrabalho | character varying(50) | YES |  |
| [ ] | bairrotrabalho | character varying(50) | YES |  |
| [ ] | idcidadetrabalho | bigint | YES |  |
| [ ] | ceptrabalho | character varying(9) | YES |  |
| [ ] | telefonetrabalho | character varying(40) | YES |  |
| [ ] | renda | numeric | YES |  |
| [ ] | imagem | bytea | YES |  |
| [ ] | idultimotipodocumentofinanceiro | bigint | YES |  |
| [ ] | datacadastro | date | YES | ('now'::text)::date |
| [ ] | tecnico | smallint | YES | 0 |
| [ ] | placaveiculo | character varying(8) | YES |  |
| [ ] | idestadoentrega | bigint | YES |  |
| [ ] | idestadocobranca | bigint | YES |  |
| [ ] | idestadotrabalho | bigint | YES |  |
| [ ] | idestadonatural | bigint | YES |  |
| [ ] | idestadoveiculo | bigint | YES |  |
| [ ] | inscricaosuframa | character varying(9) | YES |  |
| [ ] | destacaricmsst | smallint | YES |  |
| [ ] | registroimportado | smallint | YES |  |
| [ ] | comissaoavista | numeric | YES |  |
| [ ] | comissaoaprazo | numeric | YES |  |
| [ ] | pautapreco | smallint | YES |  |
| [ ] | tipoenquadramento | smallint | YES |  |
| [ ] | comprador | smallint | YES |  |
| [ ] | idrepresentante2 | bigint | YES |  |
| [ ] | idrepresentante3 | bigint | YES |  |
| [ ] | comissaonofaturamento | numeric | YES |  |
| [ ] | comissaonaquitacao | numeric | YES |  |
| [ ] | valorlimitedesconto | numeric | YES |  |
| [ ] | transmitelimitedescontonegativo | smallint | YES |  |
| [ ] | codigosupply | character varying(4) | YES |  |
| [ ] | codigouser | character varying(4) | YES |  |
| [ ] | inativo | smallint | YES |  |
| [ ] | idpais | bigint | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | idregiao | bigint | YES |  |
| [ ] | fabricante | smallint | YES |  |
| [ ] | idultimotipodocfinanceiro | bigint | YES |  |
| [ ] | transmitelimitedescontoneg | smallint | YES |  |
| [ ] | limitecreditoespecial | numeric | YES |  |
| [ ] | validadeinicialcreditoespecial | date | YES |  |
| [ ] | validadefinalcreditoespecial | date | YES |  |
| [ ] | liberarclientecomatraso | smallint | YES |  |
| [ ] | diavencimento | smallint | YES |  |
| [ ] | veiculoproprio | smallint | YES |  |
| [ ] | motorista | smallint | YES |  |
| [ ] | numerocnh | character varying(25) | YES |  |
| [ ] | categoriacnh | character varying(5) | YES |  |
| [ ] | dataemissaocnh | date | YES |  |
| [ ] | datavalidadecnh | date | YES |  |
| [ ] | codigoapogeus | character varying(3) | YES |  |
| [ ] | emailfaturamento | character varying(200) | YES |  |
| [ ] | emailfinanceiro | character varying(200) | YES |  |
| [ ] | rntrctransportador | character varying(8) | YES |  |
| [ ] | emailtecnico | character varying(200) | YES |  |
| [ ] | dialimite | smallint | YES |  |
| [ ] | site | character varying(50) | YES |  |
| [ ] | saldoadiantamento | numeric | YES |  |
| [ ] | doacao | smallint | YES |  |
| [ ] | idincentivofiscal | bigint | YES |  |
| [ ] | idoperacaofiscal | bigint | YES |  |
| [ ] | comissaoquitacao | numeric | YES |  |
| [ ] | cartaofidelidade | smallint | YES |  |
| [ ] | senhacartaofidelidade | character varying(256) | YES |  |
| [ ] | comissaopauta1 | numeric | YES |  |
| [ ] | comissaopauta2 | numeric | YES |  |
| [ ] | comissaopauta3 | numeric | YES |  |
| [ ] | comissaopauta4 | numeric | YES |  |
| [ ] | comissaoavistapauta1 | numeric | YES |  |
| [ ] | comissaoavistapauta2 | numeric | YES |  |
| [ ] | comissaoavistapauta3 | numeric | YES |  |
| [ ] | comissaoavistapauta4 | numeric | YES |  |
| [ ] | comissaoaprazopauta1 | numeric | YES |  |
| [ ] | comissaoaprazopauta2 | numeric | YES |  |
| [ ] | comissaoaprazopauta3 | numeric | YES |  |
| [ ] | comissaoaprazopauta4 | numeric | YES |  |
| [ ] | comissaoquitacaopauta1 | numeric | YES |  |
| [ ] | comissaoquitacaopauta2 | numeric | YES |  |
| [ ] | comissaoquitacaopauta3 | numeric | YES |  |
| [ ] | comissaoquitacaopauta4 | numeric | YES |  |
| [ ] | idtipocomissao | bigint | YES |  |
| [ ] | sexo | smallint | YES |  |
| [ ] | pertencefilial | smallint | YES |  |
| [ ] | idtransportadora | bigint | YES |  |
| [ ] | idtipodocumentofinanceiro | bigint | YES |  |
| [ ] | produtorrural | smallint | YES |  |
| [ ] | tipotomadorservico | character varying(1) | YES |  |
| [ ] | tipoavisofinalizaros | smallint | YES |  |
| [ ] | codigoecommerce | character varying(50) | YES |  |
| [ ] | portador | smallint | YES |  |
| [ ] | emailcomprador | character varying(200) | YES |  |
| [ ] | saldoprepago | numeric | YES |  |
| [ ] | leadtimecompra | integer | YES |  |
| [ ] | idrota | bigint | YES |  |
| [ ] | emailcotacao | character varying(200) | YES |  |
| [ ] | tipocontribuinte | smallint | YES |  |
| [ ] | emailfaturamentocopia | character varying(200) | YES |  |
| [ ] | caminhoimagem | character varying(1024) | YES |  |
| [ ] | entregador | smallint | YES |  |
| [ ] | inscricaomunicipal | character varying(20) | YES |  |
| [ ] | idfilialcadastro | bigint | YES |  |
| [ ] | idusuarioinclusao | bigint | YES |  |
| [ ] | datahorainclusao | timestamp without time zone | YES |  |
| [ ] | idusuarioalteracao | bigint | YES |  |
| [ ] | datahoraalteracao | timestamp without time zone | YES |  |
| [ ] | codigocaptacao | bigint | YES |  |
| [ ] | extra7 | character varying(512) | YES |  |
| [ ] | extra8 | character varying(512) | YES |  |
| [ ] | extra9 | character varying(512) | YES |  |
| [ ] | extra10 | character varying(512) | YES |  |
| [ ] | extra11 | character varying(512) | YES |  |
| [ ] | extra12 | character varying(512) | YES |  |
| [ ] | extra13 | character varying(512) | YES |  |
| [ ] | extra14 | character varying(512) | YES |  |
| [ ] | extra15 | character varying(512) | YES |  |
| [ ] | extra16 | character varying(512) | YES |  |
| [ ] | informacaopdv | text | YES |  |
| [ ] | idtipoentidadeopfiscal | bigint | YES |  |
| [ ] | trote | smallint | YES |  |
| [ ] | troteobs | text | YES |  |
| [ ] | registradospc | smallint | YES |  |
| [ ] | tipotelefone | smallint | YES |  |
| [ ] | dataultcompra | date | YES |  |
| [ ] | clienteatacarejo | smallint | YES |  |
| [ ] | porcmaxgerarflex | numeric | YES |  |
| [ ] | comissionado | smallint | YES |  |
| [ ] | prospect | smallint | YES |  |
| [ ] | integracaoaccera | smallint | YES |  |
| [ ] | celularcontato | character varying(40) | YES |  |
| [ ] | enviamobile | smallint | YES |  |
| [ ] | tiporevenda | smallint | YES |  |
| [ ] | substitutotributarioiss | smallint | YES |  |
| [ ] | idlocalestoque | bigint | YES |  |
| [ ] | vendermobilepauta0 | smallint | YES |  |
| [ ] | vendermobilepauta1 | smallint | YES |  |
| [ ] | vendermobilepauta2 | smallint | YES |  |
| [ ] | vendermobilepauta3 | smallint | YES |  |
| [ ] | vendermobilepauta4 | smallint | YES |  |
| [ ] | idifood | character varying(64) | YES |  |
| [ ] | phoneifood | character varying(64) | YES |  |
| [ ] | latitude | numeric | YES |  |
| [ ] | longitude | numeric | YES |  |
| [ ] | latitudeentrega | numeric | YES |  |
| [ ] | longitudeentrega | numeric | YES |  |
| [ ] | latitudecobranca | numeric | YES |  |
| [ ] | longitudecobranca | numeric | YES |  |
| [ ] | latitudetrabalho | numeric | YES |  |
| [ ] | longitudetrabalho | numeric | YES |  |
| [ ] | contador | smallint | YES |  |
| [ ] | idmercadolivre | bigint | YES |  |
| [ ] | uniplusshop | smallint | YES |  |
| [ ] | senhauniplusshop | character varying(256) | YES |  |
| [ ] | chaveuniplusshop | character(40) | YES |  |
| [ ] | referencia | character varying(50) | YES |  |
| [ ] | numeropedidosifood | bigint | YES |  |
| [ ] | idclassificacaocliente | bigint | YES |  |
| [ ] | idfilialshop | bigint | YES |  |
| [ ] | nomepersonalizadoshop | character varying(30) | YES |  |
| [ ] | percentualdescontoboleto | numeric | YES |  |
| [ ] | whatsapp | character varying(40) | YES |  |
| [ ] | idcategoriacliente | bigint | YES |  |
| [ ] | tipopessoaentrega | smallint | YES |  |
| [ ] | cnpjcpfentrega | character varying(20) | YES |  |
| [ ] | idmercos | bigint | YES |  |
| [ ] | senhades | character varying(16) | YES |  |
| [ ] | senha3des | character varying(16) | YES |  |
| [ ] | garcom | smallint | YES |  |
| [ ] | diafaturamentocontrato | smallint | YES |  |
| [ ] | bloqueiaencerracontrato | smallint | YES | 0 |
| [ ] | permitirativarlicenca | smallint | YES | 0 |
| [ ] | valorcreditointelidata | numeric | YES |  |
| [ ] | permitircomprarportal | smallint | YES | 0 |
| [ ] | utilizaaws | smallint | YES | 0 |
| [ ] | permitirdegustacao | smallint | YES | 0 |
| [ ] | idanotaai | character varying(32) | YES |  |
| [ ] | repositor | smallint | YES |  |
| [ ] | observacaonotafiscal | text | YES |  |
| [ ] | utilizanovolicenciamento | smallint | YES | 0 |
| [ ] | permitiralterarsistemacontrato | smallint | YES | 0 |
| [ ] | tipofrete | smallint | YES |  |
| [ ] | ciclocompras | integer | YES |  |
| [ ] | prazoentrega | integer | YES |  |
| [ ] | recebernotificacoes | smallint | YES |  |
| [ ] | codigovendedormercos | character varying(15) | YES |  |
| [ ] | enviarmercos | smallint | YES |  |
| [ ] | seguradora | smallint | YES |  |
| [ ] | tipowhatsapp | smallint | YES |  |
| [ ] | numeroapolice | character varying(20) | YES |  |
| [ ] | averbacoes | text | YES |  |
| [ ] | codigowoocommerce | bigint | YES |  |
| [ ] | codigonuvemshop | bigint | YES |  |
| [ ] | exibirnovidades | smallint | YES | 0 |
| [ ] | creditoicmscotacao | numeric | YES |  |
| [ ] | pedidominimo | numeric | YES |  |
| [ ] | idgrupofornecedor | bigint | YES |  |
| [ ] | adquirente | smallint | YES |  |
| [ ] | idoperadoraconciliacao | bigint | YES |  |
| [ ] | statustokenizacaocpf | smallint | YES |  |
| [ ] | idlotetokenizacaocpf | text | YES |  |
| [ ] | idclassificacaorota | bigint | YES |  |

# Colunas de "filial" (447 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('filial_id_seq'::regclass) |
| [ ] | codigo | character varying(4) | YES |  |
| [ ] | nome | character varying(60) | YES |  |
| [ ] | razaosocial | character varying(60) | YES |  |
| [ ] | endereco | character varying(50) | YES |  |
| [ ] | complemento | character varying(50) | YES |  |
| [ ] | numero | character varying(6) | YES |  |
| [ ] | bairro | character varying(50) | YES |  |
| [ ] | cep | character varying(9) | YES |  |
| [ ] | telefone | character varying(17) | YES |  |
| [ ] | cnpj | character varying(18) | YES |  |
| [ ] | inscricaoestadual | character varying(17) | YES |  |
| [ ] | inscricaomunicipal | character varying(20) | YES |  |
| [ ] | idcidade | bigint | YES |  |
| [ ] | cidade | character varying(50) | YES |  |
| [ ] | idestado | bigint | YES |  |
| [ ] | estado | character varying(3) | YES |  |
| [ ] | nsu | integer | YES |  |
| [ ] | responsavel | character varying(50) | YES |  |
| [ ] | email | character varying(200) | YES |  |
| [ ] | site | character varying(50) | YES |  |
| [ ] | formaemissaonfe | smallint | YES |  |
| [ ] | finalidadeemissaonfe | smallint | YES |  |
| [ ] | tipoambientenfe | smallint | YES |  |
| [ ] | tipocertificadonfe | smallint | YES |  |
| [ ] | arquivocertificadonfe | character varying(512) | YES |  |
| [ ] | cnae | character varying(7) | YES |  |
| [ ] | validarnfe | smallint | YES |  |
| [ ] | arquivoimagemdanfe | character varying(512) | YES |  |
| [ ] | emailcontador | character varying(200) | YES |  |
| [ ] | suframa | character varying(9) | YES |  |
| [ ] | nomecontador | character varying(50) | YES |  |
| [ ] | cnpjcontador | character varying(18) | YES |  |
| [ ] | cpfcontador | character varying(14) | YES |  |
| [ ] | crccontador | character varying(15) | YES |  |
| [ ] | cepcontador | character varying(9) | YES |  |
| [ ] | enderecocontador | character varying(50) | YES |  |
| [ ] | complementoenderecocontador | character varying(50) | YES |  |
| [ ] | numeroenderecocontador | character varying(6) | YES |  |
| [ ] | bairrocontador | character varying(50) | YES |  |
| [ ] | telefonecontador | character varying(16) | YES |  |
| [ ] | faxcontador | character varying(16) | YES |  |
| [ ] | idcidadecontador | bigint | YES |  |
| [ ] | idestadocontador | bigint | YES |  |
| [ ] | perfilarquivospedfiscal | character(1) | YES |  |
| [ ] | indicadoratividadespedfiscal | smallint | YES |  |
| [ ] | inscricaoestadualst | character varying(17) | YES |  |
| [ ] | modelonfse | smallint | YES |  |
| [ ] | caminhopastaxml | character varying(128) | YES |  |
| [ ] | optantesimples | smallint | YES | 0 |
| [ ] | versaolayoutnfe | smallint | YES |  |
| [ ] | quotadescontoprevistomes | numeric | YES |  |
| [ ] | quotadescontorealizadomes | numeric | YES |  |
| [ ] | caminhopastaretorno | character varying(128) | YES |  |
| [ ] | idempresa | bigint | YES |  |
| [ ] | tipocontribuintest | smallint | YES |  |
| [ ] | tipoenquadramento | smallint | YES |  |
| [ ] | indicadorfilial | smallint | YES |  |
| [ ] | datainscricaojunta | date | YES |  |
| [ ] | numeroinscricaojunta | character varying(11) | YES |  |
| [ ] | dataabertura | date | YES |  |
| [ ] | numeroordemlivro | character varying(50) | YES |  |
| [ ] | atividadepreponderante | smallint | YES |  |
| [ ] | indicadornaturezapj | character varying(2) | YES |  |
| [ ] | incentivadorcultural | smallint | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | incidenciatributaria | smallint | YES |  |
| [ ] | apropriacaocredito | smallint | YES |  |
| [ ] | tipocontribuicao | smallint | YES |  |
| [ ] | anexoemailnfe | smallint | YES |  |
| [ ] | contratoativo | smallint | YES |  |
| [ ] | orientacaodanfe | smallint | YES |  |
| [ ] | impressora | character varying(255) | YES |  |
| [ ] | idfilialcdm | bigint | YES |  |
| [ ] | arquivoimagemdanfse | character varying(255) | YES |  |
| [ ] | textoemailnfse | text | YES |  |
| [ ] | primeiroturnohorainicial | character varying(5) | YES |  |
| [ ] | primeiroturnohorafinal | character varying(5) | YES |  |
| [ ] | segundoturnohorainicial | character varying(5) | YES |  |
| [ ] | segundoturnohorafinal | character varying(5) | YES |  |
| [ ] | terceiroturnohorainicial | character varying(5) | YES |  |
| [ ] | terceiroturnohorafinal | character varying(5) | YES |  |
| [ ] | percentualcustoindireto | numeric | YES |  |
| [ ] | formaemissaocte | character varying(1) | YES |  |
| [ ] | tipocte | character varying(1) | YES |  |
| [ ] | tipoambientecte | smallint | YES |  |
| [ ] | validarcte | smallint | YES |  |
| [ ] | arquivoimagemdacte | character varying(512) | YES |  |
| [ ] | descricaooutroscreditos | character varying(60) | YES |  |
| [ ] | cfopvenda | character varying(4) | YES |  |
| [ ] | cfopvendast | character varying(4) | YES |  |
| [ ] | inativo | smallint | YES |  |
| [ ] | hash | integer | YES |  |
| [ ] | indicadorlucropresumido | smallint | YES |  |
| [ ] | codigotributacaomunicipio | character varying(20) | YES |  |
| [ ] | regimeespecialtributacao | smallint | YES |  |
| [ ] | tiposociedadecooperativa | character varying(2) | YES |  |
| [ ] | gerablocop | smallint | YES |  |
| [ ] | idcontribuicaoprevidenciaria | bigint | YES |  |
| [ ] | imagemdacte | bytea | YES |  |
| [ ] | registronacionaltransportador | character varying(8) | YES |  |
| [ ] | idbasecalculocreditoenergia | bigint | YES |  |
| [ ] | idbasecalculocreditoagua | bigint | YES |  |
| [ ] | idbasecalculocreditogas | bigint | YES |  |
| [ ] | idbasecalculocreditofrete | bigint | YES |  |
| [ ] | idbasecalculocredcomunicacao | bigint | YES |  |
| [ ] | idbasecalculocredtelecomunic | bigint | YES |  |
| [ ] | ultimonsuconsultanfe | bigint | YES |  |
| [ ] | apuracaoipi | integer | YES |  |
| [ ] | indicadorentradadados | character varying(1) | YES |  |
| [ ] | indicadordocumento | character varying(1) | YES |  |
| [ ] | indicadorexigibilidadeiss | character varying(1) | YES |  |
| [ ] | indicadorexigibilidadeicms | character varying(1) | YES |  |
| [ ] | exigibilidadeimpressaodf | smallint | YES |  |
| [ ] | exigibilidadeutilizacaodf | smallint | YES |  |
| [ ] | exigibilidadeinventarioanual | smallint | YES |  |
| [ ] | indicadorapresescritcontabil | character varying(1) | YES |  |
| [ ] | operacaosujeitaiss | smallint | YES |  |
| [ ] | operacaosujeitaretencaoiss | smallint | YES |  |
| [ ] | operacaosujeitaicms | smallint | YES |  |
| [ ] | operacaosujeitasubsticms | smallint | YES |  |
| [ ] | operacaosujeitaantecicms | smallint | YES |  |
| [ ] | operacaosujeitaipi | smallint | YES |  |
| [ ] | apresentacaoavulsainventario | smallint | YES |  |
| [ ] | cfopfabricacaopropria | character varying(4) | YES |  |
| [ ] | codigoreceitaicmsrecolher | character varying(25) | YES |  |
| [ ] | nomeresponsaveldia | character varying(60) | YES |  |
| [ ] | foneresponsaveldia | character varying(20) | YES |  |
| [ ] | emailresponsaveldia | character varying(60) | YES |  |
| [ ] | usarpeps | smallint | YES |  |
| [ ] | tipodatabaixapeps | smallint | YES |  |
| [ ] | permitirbaixarlotevencido | smallint | YES |  |
| [ ] | tipoambientenfce | smallint | YES |  |
| [ ] | tipocertificadonfce | smallint | YES |  |
| [ ] | arquivocertificadonfce | character varying(512) | YES |  |
| [ ] | serienfce | character varying(4) | YES |  |
| [ ] | senhacertificadonfce | character varying(256) | YES |  |
| [ ] | codigoibgecidade | bigint | YES |  |
| [ ] | codigoibgeestado | integer | YES |  |
| [ ] | codigoibgepais | integer | YES |  |
| [ ] | pais | character varying(60) | YES |  |
| [ ] | tipocontingenciacte | character varying(1) | YES |  |
| [ ] | ultimaconsultastatuscte | timestamp without time zone | YES |  |
| [ ] | cfopvendanfce | bigint | YES |  |
| [ ] | cfopvendastnfce | bigint | YES |  |
| [ ] | cfopfabricacaoproprianfce | bigint | YES |  |
| [ ] | numerotokennfce | character varying(6) | YES |  |
| [ ] | valortokennfce | character varying(64) | YES |  |
| [ ] | habilitanfce | smallint | YES |  |
| [ ] | tipoambientegnre | smallint | YES |  |
| [ ] | validargnre | smallint | YES |  |
| [ ] | idtipodocumentofinanceirognre | bigint | YES |  |
| [ ] | emitir3viaboletognre | smallint | YES |  |
| [ ] | numerotentativasenviargnre | smallint | YES |  |
| [ ] | tempoparaconsultalote | smallint | YES |  |
| [ ] | idplanocontasgnre | bigint | YES |  |
| [ ] | diasvencimentognre | smallint | YES |  |
| [ ] | tipoemitentemanifesto | smallint | YES |  |
| [ ] | formaemissaomdfe | smallint | YES |  |
| [ ] | tipoambientemdfe | smallint | YES |  |
| [ ] | validarmdfe | smallint | YES |  |
| [ ] | imagemdamdfe | bytea | YES |  |
| [ ] | usarcontingenciafsdanfe | smallint | YES |  |
| [ ] | idincentivofiscal | bigint | YES |  |
| [ ] | csosntributado | character varying(3) | YES |  |
| [ ] | csosnisento | character varying(3) | YES |  |
| [ ] | csosnnaotributado | character varying(3) | YES |  |
| [ ] | csosnsubstituicao | character varying(3) | YES |  |
| [ ] | csosnoutros | character varying(3) | YES |  |
| [ ] | csosnconhecimentoentrada | character varying(3) | YES |  |
| [ ] | observacao3registro1900 | character varying(128) | YES |  |
| [ ] | observacao4registro1900 | character varying(128) | YES |  |
| [ ] | observacao5registro1900 | character varying(128) | YES |  |
| [ ] | observacao6registro1900 | character varying(128) | YES |  |
| [ ] | observacao7registro1900 | character varying(128) | YES |  |
| [ ] | observacao8registro1900 | character varying(128) | YES |  |
| [ ] | ultimaconsultastatusnfe | timestamp without time zone | YES |  |
| [ ] | emitiritensnfregimeespecial | smallint | YES |  |
| [ ] | formaemissaonfce | smallint | YES |  |
| [ ] | cfopserviconfce | bigint | YES |  |
| [ ] | identidade | bigint | YES |  |
| [ ] | provedoruniconfse | smallint | YES |  |
| [ ] | enviaraliquotapaficmsproduto | smallint | YES |  |
| [ ] | gerarregistro0205 | smallint | YES |  |
| [ ] | gerarregistro0175 | smallint | YES |  |
| [ ] | ultimadatageracaoinventario | date | YES |  |
| [ ] | truncarvaloresregistroc490 | smallint | YES |  |
| [ ] | tipocertificadonfse | smallint | YES |  |
| [ ] | arquivocertificadonfse | character varying(512) | YES |  |
| [ ] | caminhodllsat | character varying(256) | YES |  |
| [ ] | integracaonfcesat | smallint | YES |  |
| [ ] | assinaturaac | character varying(344) | YES |  |
| [ ] | codigoativacaosat | character varying(20) | YES |  |
| [ ] | marcasat | smallint | YES |  |
| [ ] | serialsat | character varying(5) | YES |  |
| [ ] | quartoturnohorainicial | character varying(5) | YES |  |
| [ ] | quartoturnohorafinal | character varying(5) | YES |  |
| [ ] | emitiritensnfsaida | smallint | YES |  |
| [ ] | cfopvendaservico | character varying(4) | YES |  |
| [ ] | cstservico | character varying(2) | YES |  |
| [ ] | cstsnservico | character varying(3) | YES |  |
| [ ] | cfopservico | bigint | YES |  |
| [ ] | anexoemailnfse | smallint | YES |  |
| [ ] | consideracrz | smallint | YES |  |
| [ ] | autorizacontadordownloadxml | smallint | YES |  |
| [ ] | encodexmlsat | character varying(10) | YES |  |
| [ ] | conteudosedifsn | smallint | YES |  |
| [ ] | entradadadossedifsn | smallint | YES |  |
| [ ] | documentocontidosedifsn | smallint | YES |  |
| [ ] | exigibilidadeisssedifsn | character varying(1) | YES |  |
| [ ] | exigibilidadeicmssedifsn | character varying(1) | YES |  |
| [ ] | exigibilidadeimpdocsedifsn | smallint | YES |  |
| [ ] | exigibilidadeutidocsedifsn | smallint | YES |  |
| [ ] | exigibilidadelivrocombsedifsn | smallint | YES |  |
| [ ] | exigibilidaderegveicsedifsn | smallint | YES |  |
| [ ] | exigibilidadereginventsedifsn | smallint | YES |  |
| [ ] | escrituracaocontabilsedifsn | character varying(1) | YES |  |
| [ ] | operacoesisssedifsn | smallint | YES |  |
| [ ] | retencaoisssedifsn | smallint | YES |  |
| [ ] | operacoesicmssedifsn | smallint | YES |  |
| [ ] | operacoesicmsstsedifsn | smallint | YES |  |
| [ ] | operacoesantecicmssedifsn | smallint | YES |  |
| [ ] | operacoesipisedifsn | smallint | YES |  |
| [ ] | apresentacaoreginventsedifsn | smallint | YES |  |
| [ ] | certificadonfe | bytea | YES |  |
| [ ] | certificadonfse | bytea | YES |  |
| [ ] | cdm | smallint | YES |  |
| [ ] | vendaprogramada | smallint | YES |  |
| [ ] | vendaentregafutura | smallint | YES |  |
| [ ] | codigoajustefcp | character varying(8) | YES |  |
| [ ] | diavencimentoe116 | integer | YES |  |
| [ ] | arquivocertificadognre | character varying(512) | YES |  |
| [ ] | certificadognre | bytea | YES |  |
| [ ] | tipocertificadognre | smallint | YES |  |
| [ ] | codigoreceitafcpe116 | character varying(25) | YES |  |
| [ ] | descricaoreceitafcpe116 | character varying(128) | YES |  |
| [ ] | zeraricmsstdevolucaocompra | smallint | YES |  |
| [ ] | considerafcpvenda | smallint | YES |  |
| [ ] | considerafcpvendast | smallint | YES |  |
| [ ] | considerafcpfabricacao | smallint | YES |  |
| [ ] | modoapropriacao | smallint | YES |  |
| [ ] | dataimplantacao | date | YES |  |
| [ ] | modoimplantacao | smallint | YES |  |
| [ ] | modocalculodepreciacao | smallint | YES |  |
| [ ] | cfopfabricacaopropriast | character varying(4) | YES |  |
| [ ] | codigoajusteciap | character varying(8) | YES |  |
| [ ] | codigoajustefcpdebitoespecial | character varying(8) | YES |  |
| [ ] | naoenviarpiscofinsspedfiscal | smallint | YES |  |
| [ ] | enviarpiscofinsdevcompraajuste | character varying(4) | YES |  |
| [ ] | considerafcpfabricacaost | smallint | YES |  |
| [ ] | adicionartagcombustivelnfce | smallint | YES |  |
| [ ] | tipotransportador | smallint | YES |  |
| [ ] | forcartotalizadorntpararn | smallint | YES |  |
| [ ] | certificadonfce | bytea | YES |  |
| [ ] | naturezaretencaofonte | character varying(2) | YES |  |
| [ ] | codigoreceitaretencaopiscofins | character varying(4) | YES |  |
| [ ] | logotipocomprovante | character varying(255) | YES |  |
| [ ] | idpontoimpressaocomprovante | bigint | YES |  |
| [ ] | caminhoinputtemporariomfe | character varying(256) | YES |  |
| [ ] | caminhoinputmfe | character varying(256) | YES |  |
| [ ] | caminhooutputmfe | character varying(256) | YES |  |
| [ ] | versao | character varying(1) | YES |  |
| [ ] | formatarnumeroseriec100 | integer | YES |  |
| [ ] | tipoempresa | character varying(3) | YES |  |
| [ ] | senhacertificadonfe | character varying(64) | YES |  |
| [ ] | codigoreceitaicmsrecolherfrete | character varying(25) | YES |  |
| [ ] | cfopfabricacaopropriastnfce | bigint | YES |  |
| [ ] | timeouthttpnfce | integer | YES |  |
| [ ] | temposaidacontigencianfce | integer | YES |  |
| [ ] | validarxsdnfce | smallint | YES |  |
| [ ] | ativoscanntech | smallint | YES |  |
| [ ] | codigoscanntech | integer | YES |  |
| [ ] | logofilial | bytea | YES |  |
| [ ] | idcontacontabilecf | bigint | YES |  |
| [ ] | idcontacontabilconhecentrada | bigint | YES |  |
| [ ] | idcontacontabilm400 | bigint | YES |  |
| [ ] | idcontacontabilm800 | bigint | YES |  |
| [ ] | usarcodigoreduzido | smallint | YES |  |
| [ ] | imagemnfe | bytea | YES |  |
| [ ] | informarcaracteres0500 | smallint | YES |  |
| [ ] | desabilitaratacarejo | smallint | YES |  |
| [ ] | idcertificadonfe | bigint | YES |  |
| [ ] | excessosublimiterecbruta | smallint | YES |  |
| [ ] | calcularfundocombatepobreza | smallint | YES |  |
| [ ] | idcertificadonfce | bigint | YES |  |
| [ ] | modelomfe | smallint | YES |  |
| [ ] | escriturarcst70semicmsred100 | smallint | YES |  |
| [ ] | lucrobrutominimo | numeric | YES |  |
| [ ] | lucrobrutomaximo | numeric | YES |  |
| [ ] | percentualmarkupminimo | numeric | YES |  |
| [ ] | percentualmarkupmaximo | numeric | YES |  |
| [ ] | idcertificadonfse | bigint | YES |  |
| [ ] | idcertificadocte | bigint | YES |  |
| [ ] | idcertificadognre | bigint | YES |  |
| [ ] | idcertificadomdfe | bigint | YES |  |
| [ ] | versaolayoutnfce | smallint | YES |  |
| [ ] | possuiintegracaomercafacil | smallint | YES |  |
| [ ] | timezoneid | character varying(20) | YES |  |
| [ ] | naogerarregistroc191 | smallint | YES |  |
| [ ] | zeraricmsstnfentradaemiprop | smallint | YES |  |
| [ ] | enviatagresponsaveltecniconfce | smallint | YES |  |
| [ ] | enviartagresponsaveltecniconfe | smallint | YES |  |
| [ ] | naoenviar0400 | smallint | YES |  |
| [ ] | tipopessoa | smallint | YES |  |
| [ ] | tipotelefone | smallint | YES |  |
| [ ] | calculardificmsstvarejista | smallint | YES |  |
| [ ] | periodoinicialestoquepresumido | date | YES |  |
| [ ] | valorestoquepresumido | numeric | YES |  |
| [ ] | qtdparcelasestoquepresumido | smallint | YES |  |
| [ ] | idcontacontabilp100 | bigint | YES |  |
| [ ] | datainicioblocox | date | YES | '2020-06-01'::date |
| [ ] | transmitirestoqueblocox | smallint | YES | 1 |
| [ ] | tipointegracaofiscal | smallint | YES |  |
| [ ] | tokenintegracaofiscal | character varying(100) | YES |  |
| [ ] | codigoclienteintegracaofiscal | character varying(20) | YES |  |
| [ ] | diretoriointegracaofiscal | text | YES |  |
| [ ] | validaprodutointegracaofiscal | smallint | YES |  |
| [ ] | ultimaconsultastatusmdfe | timestamp without time zone | YES |  |
| [ ] | cnpjautorizadodownloadxml | character varying(18) | YES |  |
| [ ] | enviartagresponsaveltecnicocte | smallint | YES |  |
| [ ] | adicionartagicmsdesoneradonfce | smallint | YES |  |
| [ ] | aliquotaicmsdesoneradonfce | numeric | YES |  |
| [ ] | enviaricmsdesonesemdesc | smallint | YES |  |
| [ ] | arquivoimagemdamdfe | character varying(512) | YES |  |
| [ ] | forcarcontingenciacte | smallint | YES |  |
| [ ] | escriturar1070como60 | smallint | YES |  |
| [ ] | merchantusernameifood | character varying(32) | YES |  |
| [ ] | merchantpasswordifood | character varying(32) | YES |  |
| [ ] | merchantidifood | character varying(40) | YES |  |
| [ ] | numeropdvmonitorpedidosifood | smallint | YES |  |
| [ ] | pautaprecoifood | smallint | YES |  |
| [ ] | percentualacrescimoifood | numeric | YES |  |
| [ ] | classificacaocontribuinteipi | character varying(2) | YES |  |
| [ ] | gerarregistro1250 | smallint | YES |  |
| [ ] | variacaocpf | character varying(10) | YES |  |
| [ ] | contingenciasenecessariomdfe | smallint | YES |  |
| [ ] | atualizarporchaveanteriormdfe | smallint | YES |  |
| [ ] | atualizarporreciboanteriormdfe | smallint | YES |  |
| [ ] | permitirvalorpesozeradomdfe | smallint | YES |  |
| [ ] | enviarcst49devcompranaotrib | character varying(4) | YES |  |
| [ ] | imagemnfce | bytea | YES |  |
| [ ] | habilitadoifood | smallint | YES |  |
| [ ] | permiteretiradashop | smallint | YES |  |
| [ ] | prazoretiradashop | smallint | YES |  |
| [ ] | pagamentoretiradashop | smallint | YES |  |
| [ ] | versaolayoutcfe | smallint | YES |  |
| [ ] | catracamodelo | smallint | YES |  |
| [ ] | catracanumeroinicial | bigint | YES |  |
| [ ] | catracanumerofinal | bigint | YES |  |
| [ ] | catracahabilitada | smallint | YES |  |
| [ ] | forcarcontingencianfe | smallint | YES |  |
| [ ] | versaognre | smallint | YES |  |
| [ ] | podecadastrarprodutointfiscal | smallint | YES |  |
| [ ] | pdvresolvependencia | smallint | YES |  |
| [ ] | abatericmsbasepiscofins | smallint | YES |  |
| [ ] | idprocessorefredpiscofins | bigint | YES |  |
| [ ] | tipocodigocontasped | smallint | YES |  |
| [ ] | idgrupoprecificacao | bigint | YES |  |
| [ ] | atualizarpreco | smallint | YES |  |
| [ ] | gerare115beneficiors | smallint | YES |  |
| [ ] | naoescrituraricmsdescontoc170 | smallint | YES |  |
| [ ] | naoescrituraricmsdescontoc175 | smallint | YES |  |
| [ ] | naoescrituraricmsdescc870c880 | smallint | YES |  |
| [ ] | codigoajustem200devolucao | character varying(3) | YES |  |
| [ ] | catracadiretorioxmls | text | YES |  |
| [ ] | outrosimpostosgestaopreco | numeric | YES |  |
| [ ] | escriturarnomedesccomp0200 | smallint | YES |  |
| [ ] | enviarsaldoestoqueecommerce | smallint | YES |  |
| [ ] | percentualmarkdownminimo | numeric | YES |  |
| [ ] | percentualmarkdownmaximo | numeric | YES |  |
| [ ] | numeropdvmonitorpedidosgoomer | smallint | YES |  |
| [ ] | habilitadogoomer | smallint | YES |  |
| [ ] | storeidgoomer | character varying(40) | YES |  |
| [ ] | clientidgoomer | character varying(40) | YES |  |
| [ ] | clientsecretgoomer | character varying(40) | YES |  |
| [ ] | numeropdvmonitorpedidosanotaai | smallint | YES |  |
| [ ] | habilitadoanotaai | smallint | YES |  |
| [ ] | tokenanotaai | character varying(255) | YES |  |
| [ ] | habilitarcomprovantepagnfce | smallint | YES |  |
| [ ] | catracacomentarxml | smallint | YES |  |
| [ ] | datainicioestoqueblocox | date | YES |  |
| [ ] | datainicioreducaozblocox | date | YES |  |
| [ ] | possuisistematicaatacadistape | smallint | YES |  |
| [ ] | prefixogs1 | character varying(18) | YES |  |
| [ ] | sequenciags1 | character varying(18) | YES |  |
| [ ] | percentualdescretirada | numeric | YES |  |
| [ ] | codigosistematicaparticipante | character varying(8) | YES |  |
| [ ] | codigosistematicanaoparticipa | character varying(8) | YES |  |
| [ ] | abatericmspiscofinsconhecent | smallint | YES |  |
| [ ] | impressaonfseprefeitura | smallint | YES |  |
| [ ] | atualizatributacaonfe | smallint | YES |  |
| [ ] | idprodutorecebimento | bigint | YES |  |
| [ ] | idprodutovalepresente | bigint | YES |  |
| [ ] | idprodutocorrespbanc | bigint | YES |  |
| [ ] | idprodutorecargacelular | bigint | YES |  |
| [ ] | idprodutoprepago | bigint | YES |  |
| [ ] | idprodutoticketrefeicao | bigint | YES |  |
| [ ] | gerarnfceoperacaonaofiscal | smallint | YES |  |
| [ ] | tipoambientenfse | smallint | YES |  |
| [ ] | validarxmlnfse | smallint | YES |  |
| [ ] | regimesimplesnacionalnfse | character varying(1) | YES |  |
| [ ] | regimeespecialnfse | character varying(1) | YES |  |
| [ ] | numeropdvmonitorpedidosabrahao | smallint | YES |  |
| [ ] | habilitadoabrahao | smallint | YES |  |
| [ ] | tokenabrahao | character varying(255) | YES |  |
| [ ] | urlabrahao | character varying(255) | YES |  |
| [ ] | audintegracaofiscal | character varying(100) | YES |  |
| [ ] | loginintegracaofiscal | character varying(100) | YES |  |
| [ ] | senhaintegracaofiscal | character varying(100) | YES |  |
| [ ] | utilizaaliquotafinalintfiscal | smallint | YES |  |
| [ ] | tipotributacaopdvintfiscal | smallint | YES |  |
| [ ] | gerar0221codigo0200 | smallint | YES |  |
| [ ] | complementoajustefcp | character varying(255) | YES |  |
| [ ] | complementoajustefcpdebesp | character varying(255) | YES |  |
| [ ] | enviaricmsdesonesemdesccte | smallint | YES |  |
| [ ] | usernamepinbank | character varying(40) | YES |  |
| [ ] | passwordpinbank | character varying(255) | YES |  |
| [ ] | codigocanalpinbank | integer | YES |  |
| [ ] | codigoclientepinbank | character varying(40) | YES |  |
| [ ] | keylojapinbank | character varying(255) | YES |  |
| [ ] | homologacaopinbank | smallint | YES |  |
| [ ] | ipwebhookpinbank | character varying(255) | YES |  |
| [ ] | controlaprodenviadosintfiscal | smallint | YES |  |
| [ ] | habilitarcontingenciaautosp | smallint | YES |  |
| [ ] | atualizacfopintegracaofiscal | smallint | YES |  |
| [ ] | sequencialote | bigint | YES | 0 |
| [ ] | escriturarh010semvalorir | smallint | YES |  |
| [ ] | enviartagresponsaveltecmdfe | smallint | YES |  |
| [ ] | atualizapiscofinsentrada | smallint | YES |  |
| [ ] | sequencianumeroserie | bigint | YES | 0 |
| [ ] | versaoqrcodenfce | smallint | YES |  |
| [ ] | indicadoroperacaonfse | character varying(6) | YES |  |
| [ ] | nfsenacionalprovedor | smallint | YES |  |
| [ ] | tokennfsenacional | text | YES |  |
| [ ] | urlhomologacaonfsenacional | text | YES |  |
| [ ] | urlproducaonfsenacional | text | YES |  |
| [ ] | gerardanfsesistema | smallint | YES |  |
| [ ] | cpfresponsavel | text | YES |  |
| [ ] | emailresponsavel | text | YES |  |
| [ ] | telefoneresponsavel | text | YES |  |
| [ ] | datanascimentoresponsavel | text | YES |  |
| [ ] | idusersolicitacaocertificado | text | YES |  |
| [ ] | datasolicitacaocertificado | text | YES |  |
| [ ] | idprodutovalegas | bigint | YES |  |
| [ ] | idcontacontabilm225m625red | bigint | YES |  |
| [ ] | aplicaautomaticamenteintfiscal | smallint | YES |  |
| [ ] | ultimonsuconsultacte | bigint | YES |  |

# Colunas de "hierarquia" (122 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('hierarquia_id_seq'::regclass) |
| [ ] | codigo | character varying(30) | NO |  |
| [ ] | nome | character varying(40) | YES |  |
| [ ] | tabelafinanciamento | character varying(6) | YES |  |
| [ ] | classe | smallint | YES | (0)::smallint |
| [ ] | comissao | numeric | YES |  |
| [ ] | identificacliente | smallint | YES | 0 |
| [ ] | comissaoavista | numeric | YES |  |
| [ ] | comissaoaprazo | numeric | YES |  |
| [ ] | csticms | character varying(3) | YES |  |
| [ ] | ncm | character varying(10) | YES |  |
| [ ] | produtoteracotacao | smallint | YES |  |
| [ ] | cstsnicms | character varying(3) | YES |  |
| [ ] | pedevendedor | smallint | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | modalidadeicmsst | smallint | YES |  |
| [ ] | valoricmsst | numeric | YES |  |
| [ ] | percentualreducaomva | numeric | YES |  |
| [ ] | idtabelamva | bigint | YES |  |
| [ ] | situacaotributariaipi | character varying(3) | YES |  |
| [ ] | modocalculoipi | smallint | YES |  |
| [ ] | ipi | numeric | YES |  |
| [ ] | cstpis | character varying(2) | YES |  |
| [ ] | aliquotapis | numeric | YES |  |
| [ ] | cstcofins | character varying(2) | YES |  |
| [ ] | aliquotacofins | numeric | YES |  |
| [ ] | cstpisentrada | character varying(2) | YES |  |
| [ ] | aliquotapisentrada | numeric | YES |  |
| [ ] | cstcofinsentrada | character varying(2) | YES |  |
| [ ] | aliquotacofinsentrada | numeric | YES |  |
| [ ] | idbasecalculocredito | bigint | YES |  |
| [ ] | idreceitasemcontribuicao | bigint | YES |  |
| [ ] | idcontribuicaosocialapurada | bigint | YES |  |
| [ ] | idtipocredito | bigint | YES |  |
| [ ] | percentualcustoindireto | numeric | YES |  |
| [ ] | situacaotributariaipientrada | character varying(3) | YES |  |
| [ ] | idcontribuicaoprevidenciaria | bigint | YES |  |
| [ ] | modocalculoipientrada | smallint | YES |  |
| [ ] | ipientrada | numeric | YES |  |
| [ ] | idncm | bigint | YES |  |
| [ ] | prefixogrupoproduto | character varying(10) | YES |  |
| [ ] | tributacao | character varying(7) | YES |  |
| [ ] | aliquotaicmsinterna | numeric | YES |  |
| [ ] | tipoproduto | character varying(2) | YES |  |
| [ ] | iat | character(1) | YES |  |
| [ ] | ippt | character(1) | YES |  |
| [ ] | origem | smallint | YES |  |
| [ ] | produtoseramodelofichatecnica | smallint | YES |  |
| [ ] | tributacaoespecial | character varying(7) | YES |  |
| [ ] | idcontribuicaosocialapurcofins | bigint | YES |  |
| [ ] | comissaoquitacao | numeric | YES |  |
| [ ] | identificaconsumidor | smallint | YES |  |
| [ ] | comissaopauta1 | numeric | YES |  |
| [ ] | comissaopauta2 | numeric | YES |  |
| [ ] | comissaopauta3 | numeric | YES |  |
| [ ] | comissaopauta4 | numeric | YES |  |
| [ ] | comissaoavistapauta1 | numeric | YES |  |
| [ ] | comissaoavistapauta2 | numeric | YES |  |
| [ ] | comissaoavistapauta3 | numeric | YES |  |
| [ ] | comissaoavistapauta4 | numeric | YES |  |
| [ ] | comissaoaprazopauta1 | numeric | YES |  |
| [ ] | comissaoaprazopauta2 | numeric | YES |  |
| [ ] | comissaoaprazopauta3 | numeric | YES |  |
| [ ] | comissaoaprazopauta4 | numeric | YES |  |
| [ ] | comissaoquitacaopauta1 | numeric | YES |  |
| [ ] | comissaoquitacaopauta2 | numeric | YES |  |
| [ ] | comissaoquitacaopauta3 | numeric | YES |  |
| [ ] | comissaoquitacaopauta4 | numeric | YES |  |
| [ ] | icone | bytea | YES |  |
| [ ] | nummaxcombinacoes | integer | YES |  |
| [ ] | situacaotributariaentrada | character varying(3) | YES |  |
| [ ] | situacaotributariasnentrada | character varying(3) | YES |  |
| [ ] | tributacaosn | character varying(3) | YES |  |
| [ ] | tributacaoespecialnfcesat | character varying(3) | YES |  |
| [ ] | aliquotareducaoicmsnfcesat | numeric | YES |  |
| [ ] | idcest | bigint | YES |  |
| [ ] | idtabelafinanciamento | bigint | YES |  |
| [ ] | percentualreducaoicms | numeric | YES |  |
| [ ] | idcomprador | bigint | YES |  |
| [ ] | enviamobile | smallint | YES |  |
| [ ] | aliquotafcp | numeric | YES |  |
| [ ] | lucrobrutominimo | numeric | YES |  |
| [ ] | lucrobrutomaximo | numeric | YES |  |
| [ ] | percentualmarkupminimo | numeric | YES |  |
| [ ] | percentualmarkupmaximo | numeric | YES |  |
| [ ] | idbeneficiofiscaloperacao | bigint | YES |  |
| [ ] | idbeneficiofiscalnf | bigint | YES |  |
| [ ] | motivodesoneracaoicms | smallint | YES |  |
| [ ] | motivodesoneracaonf | smallint | YES |  |
| [ ] | possuialiquotacombatepobreza | smallint | YES |  |
| [ ] | aliquotaicmsnf | numeric | YES |  |
| [ ] | aliquotafcpnf | numeric | YES |  |
| [ ] | precodiferenciado | smallint | YES |  |
| [ ] | custovariavelgestaopreco | numeric | YES |  |
| [ ] | outrasdespesasgestaopreco | numeric | YES |  |
| [ ] | outrosimpostosgestaopreco | numeric | YES |  |
| [ ] | comissaogestaopreco | numeric | YES |  |
| [ ] | diferencialicmsgestaocusto | numeric | YES |  |
| [ ] | outrosvalorescredgestaocusto | numeric | YES |  |
| [ ] | outrosvaloresdebgestaocusto | numeric | YES |  |
| [ ] | percentualmarkdownminimo | numeric | YES |  |
| [ ] | percentualmarkdownmaximo | numeric | YES |  |
| [ ] | idrepositor | bigint | YES |  |
| [ ] | idcfopentrada | bigint | YES |  |
| [ ] | idcfopentradaexterna | bigint | YES |  |
| [ ] | idcfopentradadevolucaointerna | bigint | YES |  |
| [ ] | idcfopentradadevolucaoexterna | bigint | YES |  |
| [ ] | idcfopentradatransfinterna | bigint | YES |  |
| [ ] | idcfopentradatransfexterna | bigint | YES |  |
| [ ] | idcfopsaida | bigint | YES |  |
| [ ] | idcfopsaidaexterna | bigint | YES |  |
| [ ] | idcfopsaidadevolucaointerna | bigint | YES |  |
| [ ] | idcfopsaidadevolucaoexterna | bigint | YES |  |
| [ ] | idcfopsaidatransfinterna | bigint | YES |  |
| [ ] | idcfopsaidatransfexterna | bigint | YES |  |
| [ ] | idcfopsaidaexternanaocontrib | bigint | YES |  |
| [ ] | idcfopcontroleperda | bigint | YES |  |
| [ ] | idcfopsaidanfce | bigint | YES |  |
| [ ] | idbeneficiofiscalpresu | bigint | YES |  |
| [ ] | aliquotaicmspresu | numeric | YES |  |
| [ ] | idbeneficiofiscalnfpresu | bigint | YES |  |
| [ ] | aliquotaicmsnfpresu | numeric | YES |  |

# Colunas de "item" (244 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('item_id_seq'::regclass) |
| [ ] | idoperacao | bigint | YES |  |
| [ ] | contador | smallint | NO |  |
| [ ] | tipoestoque | smallint | YES |  |
| [ ] | produto | character varying(20) | YES |  |
| [ ] | variacao | smallint | YES |  |
| [ ] | quantidade | numeric | YES |  |
| [ ] | precounitario | numeric | YES |  |
| [ ] | descontoitem | numeric | YES |  |
| [ ] | descontopromocao | numeric | YES |  |
| [ ] | precobruto | numeric | YES |  |
| [ ] | descontopromocaosubtotal | numeric | YES |  |
| [ ] | descontosubtotal | numeric | YES |  |
| [ ] | arredondamento | numeric | YES |  |
| [ ] | financiamento | numeric | YES |  |
| [ ] | precoliquido | numeric | YES |  |
| [ ] | vendedor | character varying(14) | YES |  |
| [ ] | cancelado | smallint | YES |  |
| [ ] | numeroserie | character varying(50) | YES |  |
| [ ] | tributacao | character varying(5) | YES |  |
| [ ] | hierarquia | character varying(30) | YES |  |
| [ ] | unidademedida | character varying(6) | YES |  |
| [ ] | fornecedor | character varying(14) | YES |  |
| [ ] | promocao | character varying(9) | YES |  |
| [ ] | sinonimo | character varying(60) | YES |  |
| [ ] | kit | smallint | YES |  |
| [ ] | kitpai | character varying(15) | YES |  |
| [ ] | itemecf | smallint | YES |  |
| [ ] | tabelafinanciamento | character varying(6) | YES |  |
| [ ] | motivodescontoitem | smallint | YES |  |
| [ ] | usuariodescontoitem | character varying(10) | YES |  |
| [ ] | datadav | date | YES |  |
| [ ] | numerodav | character varying(20) | YES |  |
| [ ] | codigototalizadorparcial | character varying(10) | YES |  |
| [ ] | variacoes | character varying(4096) | YES |  |
| [ ] | tipodav | smallint | YES |  |
| [ ] | digitado | smallint | YES |  |
| [ ] | maxparcelaspularparames | smallint | YES |  |
| [ ] | garantiavalor | numeric | YES |  |
| [ ] | itemdav | smallint | YES |  |
| [ ] | pularparames | smallint | YES |  |
| [ ] | reservacodigo | character varying(25) | YES |  |
| [ ] | reservausuario | character varying(10) | YES |  |
| [ ] | reservadatahora | timestamp without time zone | YES |  |
| [ ] | pauta | smallint | YES |  |
| [ ] | valordav | numeric | YES |  |
| [ ] | hash | bigint | YES |  |
| [ ] | peloprecototal | smallint | YES |  |
| [ ] | acrescimoitem | numeric | YES |  |
| [ ] | ecfserie | character varying(20) | YES |  |
| [ ] | coo | integer | YES |  |
| [ ] | ccf | integer | YES |  |
| [ ] | hash2 | character varying(64) | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | brinde | smallint | YES |  |
| [ ] | supervisorcancelamento | character varying(10) | YES |  |
| [ ] | fatorconversao | numeric | YES |  |
| [ ] | precoalterado | smallint | YES |  |
| [ ] | cartaofidelidadepontos | smallint | YES |  |
| [ ] | codigocolecao | integer | YES |  |
| [ ] | idlote | bigint | YES |  |
| [ ] | supervisorprecominimo | character varying(10) | YES |  |
| [ ] | precominimovenda | numeric | YES |  |
| [ ] | tipo | character varying(1) | YES |  |
| [ ] | csticms | character varying(2) | YES |  |
| [ ] | origem | smallint | YES |  |
| [ ] | baseicms | numeric | YES |  |
| [ ] | percentualicms | numeric | YES |  |
| [ ] | icms | numeric | YES |  |
| [ ] | baseiss | numeric | YES |  |
| [ ] | percentualiss | numeric | YES |  |
| [ ] | iss | numeric | YES |  |
| [ ] | impostoaproximado | numeric | YES |  |
| [ ] | nomeproduto | character varying(120) | YES |  |
| [ ] | iat | character varying(1) | YES |  |
| [ ] | ippt | character varying(1) | YES |  |
| [ ] | decimaisquantidade | smallint | YES |  |
| [ ] | decimaispreco | smallint | YES |  |
| [ ] | ecfmfadicional | character varying(1) | YES |  |
| [ ] | ecfmodelo | character varying(20) | YES |  |
| [ ] | ecfproprietario | smallint | YES |  |
| [ ] | idembalagem | bigint | YES |  |
| [ ] | quantidadecancelada | numeric | YES |  |
| [ ] | valorcancelado | numeric | YES |  |
| [ ] | acrescimocancelado | numeric | YES |  |
| [ ] | idcfop | bigint | YES |  |
| [ ] | cfop | character varying(20) | YES |  |
| [ ] | cstsnicms | character varying(3) | YES |  |
| [ ] | comissao | numeric | YES |  |
| [ ] | comissaoavista | numeric | YES |  |
| [ ] | comissaoaprazo | numeric | YES |  |
| [ ] | comissaoquitacao | numeric | YES |  |
| [ ] | chaveibpt | character varying(6) | YES |  |
| [ ] | fonteibpt | character varying(50) | YES |  |
| [ ] | baseimpostoaproximado | numeric | YES |  |
| [ ] | percimpostoaproximado | numeric | YES |  |
| [ ] | percimpostoaproximadomunicipal | numeric | YES |  |
| [ ] | impostoaproximadomunicipal | numeric | YES |  |
| [ ] | percimpostoaproximadoestadual | numeric | YES |  |
| [ ] | impostoaproximadoestadual | numeric | YES |  |
| [ ] | percimpostoaproximadofederal | numeric | YES |  |
| [ ] | impostoaproximadofederal | numeric | YES |  |
| [ ] | cstpiscofins | character varying(2) | YES |  |
| [ ] | basepiscofins | numeric | YES |  |
| [ ] | percentualpis | numeric | YES |  |
| [ ] | pis | numeric | YES |  |
| [ ] | percentualcofins | numeric | YES |  |
| [ ] | cofins | numeric | YES |  |
| [ ] | tiporetiradaentregaitem | smallint | YES |  |
| [ ] | idfilialretirada | bigint | YES |  |
| [ ] | retirado | smallint | YES |  |
| [ ] | idusuarioretirada | bigint | YES |  |
| [ ] | datahoraretirada | timestamp without time zone | YES |  |
| [ ] | descricaoadicional | character varying(500) | YES |  |
| [ ] | aliquotareducaoicmsnfcesat | numeric | YES |  |
| [ ] | familiaproduto | character varying(30) | YES |  |
| [ ] | promocaoquota | smallint | YES |  |
| [ ] | idnotafiscalexpedicao | bigint | YES |  |
| [ ] | produtocombinado | smallint | YES |  |
| [ ] | grupopromocaokit | smallint | YES |  |
| [ ] | hashcontaclienteitem | character(40) | YES |  |
| [ ] | codigoproposta | integer | YES |  |
| [ ] | numeroproduto | integer | YES |  |
| [ ] | listapresente | smallint | YES |  |
| [ ] | impressaocupom | character varying(120) | YES |  |
| [ ] | cnpjemissor | character varying(14) | YES |  |
| [ ] | data | date | YES |  |
| [ ] | numeronotafiscal | character varying(10) | YES |  |
| [ ] | serienotafiscal | character varying(3) | YES |  |
| [ ] | chaveacesso | character varying(44) | YES |  |
| [ ] | tipodocumento | smallint | YES |  |
| [ ] | contadorpromocao | smallint | YES |  |
| [ ] | basefcpinterno | numeric | YES |  |
| [ ] | aliquotafcpinterno | numeric | YES |  |
| [ ] | valorfcpinterno | numeric | YES |  |
| [ ] | vendedor2 | character varying(14) | YES |  |
| [ ] | comissao2 | numeric | YES |  |
| [ ] | comissaoavista2 | numeric | YES |  |
| [ ] | comissaoaprazo2 | numeric | YES |  |
| [ ] | comissaoquitacao2 | numeric | YES |  |
| [ ] | codigocombinacaopromocao | smallint | YES |  |
| [ ] | taxaservico | smallint | YES |  |
| [ ] | baseicmsefetivo | numeric | YES |  |
| [ ] | aliquotaicmsefetivo | numeric | YES |  |
| [ ] | percentualredbaseicmsefetivo | numeric | YES |  |
| [ ] | valoricmsefetivo | numeric | YES |  |
| [ ] | idbeneficiofiscal | bigint | YES |  |
| [ ] | codigobeneficiofiscal | character varying(10) | YES |  |
| [ ] | baseicmsdesonerado | numeric | YES |  |
| [ ] | aliquotaicmsdesonerado | numeric | YES |  |
| [ ] | valoricmsdesonerado | numeric | YES |  |
| [ ] | motivodesoneracaoicms | smallint | YES |  |
| [ ] | idembalagemtributavel | bigint | YES |  |
| [ ] | idunidademedidatributavel | bigint | YES |  |
| [ ] | quantidadetributavel | numeric | YES |  |
| [ ] | precounitariotributavel | numeric | YES |  |
| [ ] | registraproducao | smallint | YES |  |
| [ ] | percentualdescontoitem | numeric | YES |  |
| [ ] | percentualdescontopromocao | numeric | YES |  |
| [ ] | hashpafnfce | bigint | YES |  |
| [ ] | motivocancelamento | character varying(50) | YES |  |
| [ ] | deducaoicmsbasepiscofins | numeric | YES |  |
| [ ] | quantidadepromocao | numeric | YES |  |
| [ ] | descontopromocaoabatido | numeric | YES |  |
| [ ] | tipopromocao | smallint | YES |  |
| [ ] | precounitariocomdesconto | numeric | YES |  |
| [ ] | promocaomercafacil | character varying(25) | YES |  |
| [ ] | quantidadeanterior | numeric | YES |  |
| [ ] | produtoespecifico | smallint | YES |  |
| [ ] | numerolote | character varying(30) | YES |  |
| [ ] | fabricacaolote | date | YES |  |
| [ ] | vencimentolote | date | YES |  |
| [ ] | codigoanvisa | character varying(13) | YES |  |
| [ ] | motivoisencaocodigoanvisa | character varying(255) | YES |  |
| [ ] | frete | numeric | YES |  |
| [ ] | pesoconferencia | numeric | YES |  |
| [ ] | baseicmsmonoretanterior | numeric | YES |  |
| [ ] | aliquotaicmsmonoretanterior | numeric | YES |  |
| [ ] | valoricmsmonoretanterior | numeric | YES |  |
| [ ] | eancomercial | character varying(20) | YES |  |
| [ ] | eantributavel | character varying(20) | YES |  |
| [ ] | tipodesconto | smallint | YES |  |
| [ ] | ean | character varying(20) | YES |  |
| [ ] | idlocalestoqueretirada | bigint | YES |  |
| [ ] | embalagemcompreco | smallint | YES |  |
| [ ] | percentualreducaopiscofins | numeric | YES |  |
| [ ] | outrasdespesas | numeric | YES |  |
| [ ] | idusuarioalteracaoretentrega | bigint | YES |  |
| [ ] | uuid | character varying(40) | YES |  |
| [ ] | deduzicmsdesonerado | smallint | YES |  |
| [ ] | totaldesconto | numeric | YES |  |
| [ ] | totalacrescimo | numeric | YES |  |
| [ ] | baseicmspresumido | numeric | YES |  |
| [ ] | aliquotaicmspresumido | numeric | YES |  |
| [ ] | valoricmspresumido | numeric | YES |  |
| [ ] | idbeneficiofiscalcredpresu | bigint | YES |  |
| [ ] | codigobeneficiofiscalcredpresu | character varying(10) | YES |  |
| [ ] | kitinteligente | smallint | YES |  |
| [ ] | cstibscbs | character varying(3) | YES |  |
| [ ] | idclassificacaotributaria | bigint | YES |  |
| [ ] | codigoclassificacaotributaria | character varying(6) | YES |  |
| [ ] | basecalculoibscbs | numeric | YES |  |
| [ ] | aliquotaibsuf | numeric | YES |  |
| [ ] | reducaoaliquotaibsuf | numeric | YES |  |
| [ ] | aliquotaefetivaibsuf | numeric | YES |  |
| [ ] | valoribsuf | numeric | YES |  |
| [ ] | aliquotaibsmun | numeric | YES |  |
| [ ] | reducaoaliquotaibsmun | numeric | YES |  |
| [ ] | aliquotaefetivaibsmun | numeric | YES |  |
| [ ] | valoribsmun | numeric | YES |  |
| [ ] | aliquotacbs | numeric | YES |  |
| [ ] | reducaoaliquotacbs | numeric | YES |  |
| [ ] | aliquotaefetivacbs | numeric | YES |  |
| [ ] | valorcbs | numeric | YES |  |
| [ ] | valoribs | numeric | YES |  |
| [ ] | cstibscbsreg | character varying(3) | YES |  |
| [ ] | idclassificacaotributariareg | bigint | YES |  |
| [ ] | codigoclassificacaotribreg | character varying(6) | YES |  |
| [ ] | basecalculoibscbsreg | numeric | YES |  |
| [ ] | valoribsufreg | numeric | YES |  |
| [ ] | valoribsmunreg | numeric | YES |  |
| [ ] | valoribsreg | numeric | YES |  |
| [ ] | valorcbsreg | numeric | YES |  |
| [ ] | aliquotaibsufreg | numeric | YES |  |
| [ ] | redaliquotaibsufreg | numeric | YES |  |
| [ ] | aliquotaefetibsufreg | numeric | YES |  |
| [ ] | aliquotaibsmunreg | numeric | YES |  |
| [ ] | redaliquotaibsmunreg | numeric | YES |  |
| [ ] | aliquotaefetibsmunreg | numeric | YES |  |
| [ ] | aliquotacbsreg | numeric | YES |  |
| [ ] | reducaoaliquotacbsreg | numeric | YES |  |
| [ ] | aliquotaefetivacbsreg | numeric | YES |  |
| [ ] | valoribsufdiferido | numeric | YES |  |
| [ ] | percentualibsufdiferido | numeric | YES |  |
| [ ] | valoribsmundiferido | numeric | YES |  |
| [ ] | percentualibsmundiferido | numeric | YES |  |
| [ ] | valorcbsdiferido | numeric | YES |  |
| [ ] | percentualcbsdiferido | numeric | YES |  |
| [ ] | quantidademonoretibscbs | numeric | YES |  |
| [ ] | aliquotamonoretibs | numeric | YES |  |
| [ ] | valormonoretibs | numeric | YES |  |
| [ ] | aliquotamonoretcbs | numeric | YES |  |
| [ ] | valormonoretcbs | numeric | YES |  |
| [ ] | promocaofinalizador | smallint | YES |  |

# Colunas de "notafiscal" (433 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('notafiscal_id_seq'::regclass) |
| [ ] | tipodocumento | character varying(2) | YES |  |
| [ ] | idfilial | bigint | YES |  |
| [ ] | identidade | bigint | YES |  |
| [ ] | numeronotafiscal | character varying(11) | YES |  |
| [ ] | documentoorigem | bigint | YES |  |
| [ ] | idrepresentante | bigint | YES |  |
| [ ] | idcfop | bigint | YES |  |
| [ ] | descricaocfop | character varying(1024) | YES |  |
| [ ] | baseicms | numeric | YES | 0.00 |
| [ ] | icms | numeric | YES | 0.00 |
| [ ] | baseicmssubstituicao | numeric | YES | 0.00 |
| [ ] | icmssubstituicao | numeric | YES | 0.00 |
| [ ] | acrescimosproduto | numeric | YES | 0.00 |
| [ ] | descontoproduto | numeric | YES |  |
| [ ] | razaosocial | character varying(60) | YES |  |
| [ ] | endereco | character varying(60) | YES |  |
| [ ] | bairro | character varying(50) | YES |  |
| [ ] | complemento | character varying(50) | YES |  |
| [ ] | cep | character varying(9) | YES |  |
| [ ] | idcidade | bigint | YES |  |
| [ ] | cidade | character varying(50) | YES |  |
| [ ] | estado | character(2) | YES |  |
| [ ] | cnpjcpf | character varying(20) | YES |  |
| [ ] | inscricaoestadual | character varying(20) | YES |  |
| [ ] | totalproduto | numeric | YES | 0.00 |
| [ ] | frete | numeric | YES | 0.00 |
| [ ] | seguro | numeric | YES | 0.00 |
| [ ] | outrasdespesas | numeric | YES | 0.00 |
| [ ] | extra | numeric | YES |  |
| [ ] | ipi | numeric | YES | 0.00 |
| [ ] | totalservicos | numeric | YES |  |
| [ ] | acrescimoservicos | numeric | YES | 0.00 |
| [ ] | descontoservicos | numeric | YES | 0.00 |
| [ ] | iss | numeric | YES | 0.00 |
| [ ] | idtransportadora | bigint | YES |  |
| [ ] | nometransportadora | character varying(60) | YES |  |
| [ ] | cnpjcpftransportadora | character varying(18) | YES |  |
| [ ] | enderecotransportadora | character varying(60) | YES |  |
| [ ] | idcidadetransportadora | bigint | YES |  |
| [ ] | cidadetransportadora | character varying(50) | YES |  |
| [ ] | estadotransportadora | character(2) | YES |  |
| [ ] | inscricaoestadualtransportadora | character varying(20) | YES |  |
| [ ] | tipofrete | smallint | YES |  |
| [ ] | placaveiculo | character varying(8) | YES |  |
| [ ] | estadoveiculo | character(2) | YES |  |
| [ ] | quantidade | numeric | YES |  |
| [ ] | especie | character varying(60) | YES |  |
| [ ] | marca | character varying(60) | YES |  |
| [ ] | numero | character varying(60) | YES |  |
| [ ] | pesobruto | numeric | YES | 0.000 |
| [ ] | pesoliquido | numeric | YES | 0.000 |
| [ ] | status | smallint | YES |  |
| [ ] | informacoescomplementaresgeradas | text | YES |  |
| [ ] | emissao | date | YES |  |
| [ ] | entradasaida | date | YES |  |
| [ ] | horasaida | time without time zone | YES |  |
| [ ] | datahoransu | timestamp without time zone | YES |  |
| [ ] | nsu | integer | YES | 0 |
| [ ] | valortotalnota | numeric | YES |  |
| [ ] | impresso | smallint | YES |  |
| [ ] | tipoemissao | character(1) | YES |  |
| [ ] | codigoantecipacaotributaria | smallint | YES |  |
| [ ] | serie | character varying(6) | YES |  |
| [ ] | telefone | character varying(40) | YES |  |
| [ ] | funrural | numeric | YES |  |
| [ ] | idestado | bigint | YES |  |
| [ ] | descontosubtotal | numeric | YES |  |
| [ ] | modelo | character varying(5) | YES |  |
| [ ] | pautapreco | smallint | YES |  |
| [ ] | idestadotransportadora | bigint | YES |  |
| [ ] | idestadoveiculo | bigint | YES |  |
| [ ] | proprio | smallint | YES |  |
| [ ] | avista | numeric | YES |  |
| [ ] | aprazo | numeric | YES |  |
| [ ] | numeroendereco | character varying(6) | YES |  |
| [ ] | chavenfe | character varying(50) | YES |  |
| [ ] | recibotransmissaonfe | character varying(18) | YES |  |
| [ ] | codigostatustransmissaonfe | smallint | YES |  |
| [ ] | mensagemtransmissaonfe | text | YES |  |
| [ ] | protocolonfe | character varying(18) | YES |  |
| [ ] | codigostatusprotocolonfe | smallint | YES |  |
| [ ] | mensagemprotocolonfe | text | YES |  |
| [ ] | recebimentonfe | character varying(30) | YES |  |
| [ ] | cancelamento | timestamp without time zone | YES |  |
| [ ] | justificativacancelamentonfe | character varying(255) | YES |  |
| [ ] | idmotivodesconto | bigint | YES |  |
| [ ] | notaempenho | character varying(22) | YES |  |
| [ ] | pedido | character varying(60) | YES |  |
| [ ] | contrato | character varying(60) | YES |  |
| [ ] | idoperacao | bigint | YES |  |
| [ ] | dinheiro | numeric | YES |  |
| [ ] | cheque | numeric | YES |  |
| [ ] | devolucao | numeric | YES |  |
| [ ] | financiado | numeric | YES |  |
| [ ] | outros | numeric | YES |  |
| [ ] | idtipodocumento | bigint | YES |  |
| [ ] | idcondicaopagto | bigint | YES |  |
| [ ] | transferencia | smallint | YES |  |
| [ ] | tipoambientenfe | smallint | YES |  |
| [ ] | enderecoentrega | character varying(60) | YES |  |
| [ ] | complementoentrega | character varying(60) | YES |  |
| [ ] | bairroentrega | character varying(50) | YES |  |
| [ ] | idcidadeentrega | bigint | YES |  |
| [ ] | cepentrega | character varying(9) | YES |  |
| [ ] | numeroenderecoentrega | character varying(6) | YES |  |
| [ ] | telefoneentrega | character varying(40) | YES |  |
| [ ] | celularentrega | character varying(40) | YES |  |
| [ ] | idestadoentrega | bigint | YES |  |
| [ ] | idnotareferenciada | bigint | YES |  |
| [ ] | informacoescomplementarespersonalizadas | text | YES |  |
| [ ] | retencaoiss | numeric | YES |  |
| [ ] | pis | numeric | YES |  |
| [ ] | cofins | numeric | YES |  |
| [ ] | impostorenda | numeric | YES |  |
| [ ] | inss | numeric | YES |  |
| [ ] | contribuicaosocial | numeric | YES |  |
| [ ] | baseiss | numeric | YES |  |
| [ ] | idusuarioinclusao | bigint | YES |  |
| [ ] | idusuarioalteracao | bigint | YES |  |
| [ ] | datainclusao | timestamp without time zone | YES |  |
| [ ] | dataalteracao | timestamp without time zone | YES |  |
| [ ] | arquivoxmlautorizada | bytea | YES |  |
| [ ] | arquivoxmlcancelada | bytea | YES |  |
| [ ] | percentualdescontosubtotal | numeric | YES |  |
| [ ] | arquivoxmlcontingencia | bytea | YES |  |
| [ ] | motivocontingencia | character varying(256) | YES |  |
| [ ] | datacontingencia | character varying(10) | YES |  |
| [ ] | horacontingencia | character varying(8) | YES |  |
| [ ] | tipoorigem | smallint | YES |  |
| [ ] | numeronfse | character varying(20) | YES |  |
| [ ] | valoricmsoutras | numeric | YES |  |
| [ ] | valoricmsisenta | numeric | YES |  |
| [ ] | aliquotaicms | numeric | YES |  |
| [ ] | naturezaoperacaoconhecimentotransporte | character varying(5) | YES |  |
| [ ] | percentualcomissaofaturamento | numeric | YES |  |
| [ ] | percentualcomissaoquitacao | numeric | YES |  |
| [ ] | idnotafiscaltransferenciadestino | bigint | YES |  |
| [ ] | despesasimportacao | numeric | YES |  |
| [ ] | idpais | bigint | YES |  |
| [ ] | numerodi | character varying(15) | YES |  |
| [ ] | datadi | date | YES |  |
| [ ] | localdesembaraco | character varying(60) | YES |  |
| [ ] | idestadodesembaraco | bigint | YES |  |
| [ ] | datadesembaraco | date | YES |  |
| [ ] | codigoexportador | character varying(60) | YES |  |
| [ ] | numerodrawback | character varying(20) | YES |  |
| [ ] | tipodocumentoimportacao | smallint | YES |  |
| [ ] | baseicmsdiferido | numeric | YES |  |
| [ ] | icmsdiferido | numeric | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | idserie | bigint | YES |  |
| [ ] | cstpiscofinsconhecimento | character varying(2) | YES |  |
| [ ] | basepiscofinsconhecimento | numeric | YES |  |
| [ ] | indicadornaturezafrete | smallint | YES |  |
| [ ] | naturezabasecalculocredito | character varying(2) | YES |  |
| [ ] | aliquotapisconhecimento | numeric | YES |  |
| [ ] | aliquotacofinsconhecimento | numeric | YES |  |
| [ ] | ietransportadora | character varying(20) | YES |  |
| [ ] | infocompgerada | text | YES |  |
| [ ] | infocomppersonalizada | text | YES |  |
| [ ] | arquivoxmlnotaoriginal | bytea | YES |  |
| [ ] | cfopconhecimentotransporte | character varying(5) | YES |  |
| [ ] | idnotafiscaltransfdestino | bigint | YES |  |
| [ ] | datapedido | date | YES |  |
| [ ] | diafaturamentocontrato | smallint | YES |  |
| [ ] | alterado | smallint | YES |  |
| [ ] | idnotarelacionadaconhecimento | bigint | YES |  |
| [ ] | idbasecalculocredito | bigint | YES |  |
| [ ] | idtipocredito | bigint | YES |  |
| [ ] | possuicartacorrecao | smallint | YES |  |
| [ ] | impostoimportacao | numeric | YES |  |
| [ ] | consumoenergia | character varying(2) | YES |  |
| [ ] | tipoligacao | character varying(2) | YES |  |
| [ ] | tipotensao | character varying(2) | YES |  |
| [ ] | tipoassinante | character varying(2) | YES |  |
| [ ] | consumoagua | character varying(2) | YES |  |
| [ ] | baseicmsnaoaproveitado | numeric | YES |  |
| [ ] | icmsnaoaproveitado | numeric | YES |  |
| [ ] | baseicmsstanterior | numeric | YES |  |
| [ ] | valoricmsstanterior | numeric | YES |  |
| [ ] | dataemissaonotaprodutor | date | YES |  |
| [ ] | numeroserienotaprodutor | character varying(3) | YES |  |
| [ ] | numeronotaprodutor | character varying(9) | YES |  |
| [ ] | infofisco | text | YES |  |
| [ ] | notafiscalseraentregue | smallint | YES |  |
| [ ] | statuscarga | smallint | YES |  |
| [ ] | notafiscalseraretirada | smallint | YES |  |
| [ ] | statusretirada | smallint | YES |  |
| [ ] | canceladoporevento | smallint | YES |  |
| [ ] | notadesagregacaoinsumos | smallint | YES |  |
| [ ] | iddocumentoconsignacao | bigint | YES |  |
| [ ] | tipodocumentoconsignacao | smallint | YES |  |
| [ ] | idnotaentradaconsignacao | bigint | YES |  |
| [ ] | consignacaogerada | smallint | YES |  |
| [ ] | dataextemporanea | date | YES |  |
| [ ] | classeconsumoenergia | character varying(2) | YES |  |
| [ ] | classeconsumogas | character varying(2) | YES |  |
| [ ] | classeconsumoagua | character varying(2) | YES |  |
| [ ] | classeconsumocomunicacao | character varying(2) | YES |  |
| [ ] | numerocheque | character varying(20) | YES |  |
| [ ] | vencimentocheque | date | YES |  |
| [ ] | idbancocheque | bigint | YES |  |
| [ ] | agenciabancocheque | character varying(10) | YES |  |
| [ ] | numerocontacorrentebancocheque | character varying(10) | YES |  |
| [ ] | cpfcnpjemitentecheque | character varying(20) | YES |  |
| [ ] | nomeemitentecheque | character varying(60) | YES |  |
| [ ] | impostoaproximado | numeric | YES |  |
| [ ] | observacao | text | YES |  |
| [ ] | conferenciafinanceira | smallint | YES |  |
| [ ] | conferenciafisica | smallint | YES |  |
| [ ] | idobservacaolancamentofiscal | bigint | YES |  |
| [ ] | cnpjcpfentrega | character varying(18) | YES |  |
| [ ] | idoperacaofiscal | bigint | YES |  |
| [ ] | posavista | numeric | YES |  |
| [ ] | posaprazo | numeric | YES |  |
| [ ] | taxasiscomex | numeric | YES |  |
| [ ] | formaemissaonfe | smallint | YES |  |
| [ ] | datahoraemissao | timestamp without time zone | YES |  |
| [ ] | datahoraentradasaida | timestamp without time zone | YES |  |
| [ ] | modelodocumentoreferenciado | character varying(10) | YES |  |
| [ ] | chavedocumentoreferenciado | character varying(44) | YES |  |
| [ ] | numerodocumentoreferenciado | character varying(11) | YES |  |
| [ ] | seriedocumentoreferenciado | character varying(6) | YES |  |
| [ ] | coodocumentoreferenciado | integer | YES |  |
| [ ] | pdvdocumentoreferenciado | smallint | YES |  |
| [ ] | datadocumentoreferenciado | date | YES |  |
| [ ] | valorimpostosincentivados | numeric | YES |  |
| [ ] | valorpisincentivado | numeric | YES |  |
| [ ] | valorcofinsincentivado | numeric | YES |  |
| [ ] | valoricmsincentivado | numeric | YES |  |
| [ ] | mediaaliquotapisincentivado | numeric | YES |  |
| [ ] | mediaaliquotacofinsincentivado | numeric | YES |  |
| [ ] | mediaaliquotaicmsincentivado | numeric | YES |  |
| [ ] | tipoviatransporteinternacional | smallint | YES |  |
| [ ] | valorafrmm | numeric | YES |  |
| [ ] | formaintermedioimportacao | smallint | YES |  |
| [ ] | numeroregistroexportacao | character varying(12) | YES |  |
| [ ] | chavenferecebidaexportacao | character varying(44) | YES |  |
| [ ] | localsaidapais | character varying(60) | YES |  |
| [ ] | localdespacho | character varying(60) | YES |  |
| [ ] | idestadosaidapais | bigint | YES |  |
| [ ] | identidadefilialanterior | bigint | YES |  |
| [ ] | datavencimentocontrato | date | YES |  |
| [ ] | linknfse | text | YES |  |
| [ ] | codigoautenticidadenfse | character varying(255) | YES |  |
| [ ] | numeroloteenvio | integer | YES |  |
| [ ] | numerolotecancelamento | integer | YES |  |
| [ ] | csticmsconhecimento | character varying(3) | YES |  |
| [ ] | csticmssnconhecimento | character varying(3) | YES |  |
| [ ] | percentualredbaseicmsconhec | numeric | YES |  |
| [ ] | ecfseriedocumentoreferenciado | character varying(20) | YES |  |
| [ ] | finalidadeemissaonfe | smallint | YES |  |
| [ ] | modelonotaprodutor | character varying(2) | YES |  |
| [ ] | icmsdestino | numeric | YES |  |
| [ ] | icmsremetente | numeric | YES |  |
| [ ] | icmsfundopobreza | numeric | YES |  |
| [ ] | basecalculoicmsdifal | numeric | YES |  |
| [ ] | tipocontribuinte | smallint | YES |  |
| [ ] | consumidorfinal | smallint | YES |  |
| [ ] | conferencia | smallint | YES |  |
| [ ] | idusuarioconffinanceira | bigint | YES |  |
| [ ] | dataconffinanceira | timestamp without time zone | YES |  |
| [ ] | idusuarioconfcega | bigint | YES |  |
| [ ] | dataconfcega | timestamp without time zone | YES |  |
| [ ] | idcidadeprestacaoservico | bigint | YES |  |
| [ ] | idestadoprestacaoservico | bigint | YES |  |
| [ ] | tiponotadocumentoreferenciado | character varying(3) | YES |  |
| [ ] | origemprincipal | integer | YES |  |
| [ ] | transferenciaentradaautomatica | smallint | YES |  |
| [ ] | idlocalestoqueentradatransf | bigint | YES |  |
| [ ] | valorvendor | numeric | YES |  |
| [ ] | baseimpostorenda | numeric | YES |  |
| [ ] | basecontribuicaosocial | numeric | YES |  |
| [ ] | baseinss | numeric | YES |  |
| [ ] | basepisretido | numeric | YES |  |
| [ ] | pisretido | numeric | YES |  |
| [ ] | basecofinsretido | numeric | YES |  |
| [ ] | cofinsretido | numeric | YES |  |
| [ ] | tiporateioconhecimento | smallint | YES |  |
| [ ] | idnotadesagregacaoinsumos | bigint | YES |  |
| [ ] | idlocalestoquesaidatransf | bigint | YES |  |
| [ ] | precopendente | smallint | YES |  |
| [ ] | idplanocontas | bigint | YES |  |
| [ ] | tiporateiocentrocusto | smallint | YES |  |
| [ ] | datapreparacao | date | YES |  |
| [ ] | idcidadeobra | bigint | YES |  |
| [ ] | idestadoobra | bigint | YES |  |
| [ ] | numeroart | character varying(20) | YES |  |
| [ ] | numerocei | character varying(20) | YES |  |
| [ ] | numeromatricula | character varying(20) | YES |  |
| [ ] | numeroprojeto | character varying(20) | YES |  |
| [ ] | numeroobra | character varying(20) | YES |  |
| [ ] | bairroobra | character varying(60) | YES |  |
| [ ] | complementolocalobra | character varying(255) | YES |  |
| [ ] | logradouroobra | character varying(255) | YES |  |
| [ ] | cepobra | character varying(9) | YES |  |
| [ ] | tipocte | character varying(2) | YES |  |
| [ ] | numeroenderecotransportadora | character varying(6) | YES |  |
| [ ] | cnpjemissor | character varying(14) | YES |  |
| [ ] | inddescontosubtotal | character varying(1) | YES |  |
| [ ] | indacrescimosubtotal | character varying(1) | YES |  |
| [ ] | acrescimosubtotal | numeric | YES |  |
| [ ] | acrescimocancelamento | numeric | YES |  |
| [ ] | ordemdescontoacrescimo | character varying(1) | YES |  |
| [ ] | tipodocumentopaf | character varying(1) | YES |  |
| [ ] | hash | bigint | YES |  |
| [ ] | idestadoorigemconhec | bigint | YES |  |
| [ ] | idestadodestinoconhec | bigint | YES |  |
| [ ] | idcidadeorigemconhec | bigint | YES |  |
| [ ] | idcidadedestinoconhec | bigint | YES |  |
| [ ] | icmsfundopobrezainterno | numeric | YES |  |
| [ ] | icmsfundopobrezast | numeric | YES |  |
| [ ] | basefcpstanterior | numeric | YES |  |
| [ ] | valorfcpstanterior | numeric | YES |  |
| [ ] | idrepresentante2 | bigint | YES |  |
| [ ] | percentualcomissaofaturamento2 | numeric | YES |  |
| [ ] | percentualcomissaoquitacao2 | numeric | YES |  |
| [ ] | cpfcnpjautorizadoxml | character varying(20) | YES |  |
| [ ] | protocoloepec | character varying(50) | YES |  |
| [ ] | arquivoxmleventoepec | bytea | YES |  |
| [ ] | pendenciarps | smallint | YES |  |
| [ ] | codigoerrotransmissao | character varying(20) | YES |  |
| [ ] | idlocalestoque | bigint | YES |  |
| [ ] | idbeneficiador | bigint | YES |  |
| [ ] | idclientedobeneficiador | bigint | YES |  |
| [ ] | baseicmsefetivo | numeric | YES |  |
| [ ] | valoricmsefetivo | numeric | YES |  |
| [ ] | tipotelefone | smallint | YES |  |
| [ ] | valoricmsdesoneradosemdesconto | numeric | YES |  |
| [ ] | icmsfundopobrezainternonaoapro | numeric | YES |  |
| [ ] | devolucaoautomatica | smallint | YES |  |
| [ ] | arquivoxmlconsultasituacao | bytea | YES |  |
| [ ] | datahoraconsultasituacao | timestamp without time zone | YES |  |
| [ ] | statusconsignacaoentrada | smallint | YES |  |
| [ ] | longitude | numeric | YES |  |
| [ ] | latitude | numeric | YES |  |
| [ ] | longitudeentrega | numeric | YES |  |
| [ ] | latitudeentrega | numeric | YES |  |
| [ ] | arquivoxmldenegada | bytea | YES |  |
| [ ] | arquivoxmlassinado | bytea | YES |  |
| [ ] | infofiscogerada | text | YES |  |
| [ ] | deposito | numeric | YES |  |
| [ ] | pix | numeric | YES |  |
| [ ] | carteiradigital | numeric | YES |  |
| [ ] | idcontacorrentedeposito | bigint | YES |  |
| [ ] | idcontacorrentepix | bigint | YES |  |
| [ ] | idadmcarteiradigital | bigint | YES |  |
| [ ] | idnotafiscalvendaexpedicao | bigint | YES |  |
| [ ] | idtransacaofinanceira | bigint | YES |  |
| [ ] | idintermediadormarketplace | bigint | YES |  |
| [ ] | presencaconsumidor | smallint | YES |  |
| [ ] | statusdesagregacao | character(1) | YES |  |
| [ ] | idlocalretirada | bigint | YES |  |
| [ ] | razaosocialnomeentrega | character varying(60) | YES |  |
| [ ] | emailentrega | character varying(60) | YES |  |
| [ ] | idusuarioliberouatraso | bigint | YES |  |
| [ ] | idusuarioliberoulimite | bigint | YES |  |
| [ ] | subserie | character varying(3) | YES |  |
| [ ] | statusconferencia | smallint | YES |  |
| [ ] | idusuarioconferencia | bigint | YES |  |
| [ ] | dataconferencia | timestamp without time zone | YES |  |
| [ ] | movimentacaogravadaconferencia | smallint | YES |  |
| [ ] | totalqtdicmsmonofasicoproprio | numeric | YES |  |
| [ ] | totalicmsmonofasicoproprio | numeric | YES |  |
| [ ] | totalqtdicmsmonofasicoretencao | numeric | YES |  |
| [ ] | totalicmsmonofasicoretencao | numeric | YES |  |
| [ ] | totalqtdicmsmonoretanterior | numeric | YES |  |
| [ ] | totalicmsmonoretanterior | numeric | YES |  |
| [ ] | ipiorigemdevolucao | numeric | YES |  |
| [ ] | baseipiorigemdevolucao | numeric | YES |  |
| [ ] | icmsstorigemdevolucao | numeric | YES |  |
| [ ] | baseicmsstorigemdevolucao | numeric | YES |  |
| [ ] | arquivoxmldps | bytea | YES |  |
| [ ] | chavedps | character varying(42) | YES |  |
| [ ] | pdfnfsenacional | bytea | YES |  |
| [ ] | nfsenacional | smallint | YES |  |
| [ ] | idtranspredesp | bigint | YES |  |
| [ ] | nometranspredesp | character varying(60) | YES |  |
| [ ] | cnpjcpftranspredesp | character varying(18) | YES |  |
| [ ] | enderecotranspredesp | character varying(60) | YES |  |
| [ ] | numeroenderecotranspredesp | character varying(6) | YES |  |
| [ ] | idcidadetranspredesp | bigint | YES |  |
| [ ] | cidadetranspredesp | character varying(50) | YES |  |
| [ ] | estadotranspredesp | character(2) | YES |  |
| [ ] | ietranspredesp | character varying(20) | YES |  |
| [ ] | obstranspredesp | character varying(128) | YES |  |
| [ ] | idestadotranspredesp | bigint | YES |  |
| [ ] | baseicmsstpresumido | numeric | YES |  |
| [ ] | valoricmsstpresumido | numeric | YES |  |
| [ ] | codigoautorizacaopix | character varying(128) | YES |  |
| [ ] | transmissaopdv | smallint | YES |  |
| [ ] | pixdinamico | smallint | YES |  |
| [ ] | tipoemissaoregimeespecial | smallint | YES |  |
| [ ] | idregimeespecial | bigint | YES |  |
| [ ] | finalidadenfcom | smallint | YES |  |
| [ ] | faturamentonfcom | smallint | YES |  |
| [ ] | tipoguiatransito | smallint | YES |  |
| [ ] | idestadoguiatransito | bigint | YES |  |
| [ ] | numeroguiatransito | character varying(9) | YES |  |
| [ ] | serieguiatransito | character varying(9) | YES |  |
| [ ] | idusuarioestornoconferencia | bigint | YES |  |
| [ ] | basecalculoibscbs | numeric | YES |  |
| [ ] | valoribsuf | numeric | YES |  |
| [ ] | valoribsmun | numeric | YES |  |
| [ ] | valoribs | numeric | YES |  |
| [ ] | valorcbs | numeric | YES |  |
| [ ] | previsaoentrega | date | YES |  |
| [ ] | valoribsmonofasicoretido | numeric | YES |  |
| [ ] | valorcbsmonofasicoretido | numeric | YES |  |
| [ ] | valoribsufdiferido | numeric | YES |  |
| [ ] | valoribsmundiferido | numeric | YES |  |
| [ ] | valorcbsdiferido | numeric | YES |  |
| [ ] | inscricaoimobiliariaobra | character varying(30) | YES |  |
| [ ] | numeroidentificacaoobra | character varying(30) | YES |  |
| [ ] | codigocadimobiliarioobra | character varying(8) | YES |  |
| [ ] | nomeevento | character varying(255) | YES |  |
| [ ] | datainicioevento | date | YES |  |
| [ ] | datafimevento | date | YES |  |
| [ ] | codigoidentificadorevento | character varying(30) | YES |  |
| [ ] | numeroenderecoevento | character varying(60) | YES |  |
| [ ] | bairroevento | character varying(60) | YES |  |
| [ ] | complementoevento | character varying(156) | YES |  |
| [ ] | logradouroevento | character varying(255) | YES |  |
| [ ] | cepevento | character varying(9) | YES |  |
| [ ] | idusuariocancelamento | bigint | YES |  |
| [ ] | tipodadosobra | smallint | YES |  |
| [ ] | iddependente | bigint | YES |  |
| [ ] | chavesubstituido | character varying(50) | YES |  |
| [ ] | tiponotadebito | character varying(2) | YES |  |
| [ ] | tiponotacredito | character varying(2) | YES |  |
| [ ] | periodoapuracao | date | YES |  |
| [ ] | valorfcpinternodiferido | numeric | YES |  |

# Colunas de "notafiscalitem" (475 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('notafiscalitem_id_seq'::regclass) |
| [ ] | idnotafiscal | bigint | YES |  |
| [ ] | idproduto | bigint | YES |  |
| [ ] | tipo | character(1) | YES |  |
| [ ] | produto | character varying(20) | YES |  |
| [ ] | descricao | character varying(120) | YES |  |
| [ ] | precounitario | numeric | YES | 0.000 |
| [ ] | quantidade | numeric | YES | 0.000 |
| [ ] | unidade | character varying(6) | YES |  |
| [ ] | acrescimo | numeric | YES | 0.00 |
| [ ] | desconto | numeric | YES | 0.00 |
| [ ] | idmotivodesconto | bigint | YES |  |
| [ ] | tributacao | character varying(7) | YES |  |
| [ ] | percentualipi | numeric | YES | 0.00 |
| [ ] | ipi | numeric | YES | 0.00 |
| [ ] | percentualicms | numeric | YES | 0.00 |
| [ ] | baseicms | numeric | YES | 0.00 |
| [ ] | percentualreducaoicms | numeric | YES | 0.00 |
| [ ] | icms | numeric | YES | 0.00 |
| [ ] | percentualicmssubstituicao | numeric | YES | 0.00 |
| [ ] | baseicmssubstituicao | numeric | YES | 0.00 |
| [ ] | icmssubstituicao | numeric | YES | 0.00 |
| [ ] | percentualiss | numeric | YES | 0.00 |
| [ ] | percentualreducaoiss | numeric | YES | 0.00 |
| [ ] | baseiss | numeric | YES |  |
| [ ] | iss | numeric | YES | 0.00 |
| [ ] | total | numeric | YES | 0.00 |
| [ ] | observacao | character varying(20) | YES |  |
| [ ] | classificacaofiscal | character varying(8) | YES |  |
| [ ] | idcfop | bigint | YES |  |
| [ ] | ncm | character varying(11) | YES |  |
| [ ] | situacaotributaria | character varying(3) | YES |  |
| [ ] | contador | smallint | YES |  |
| [ ] | descontosubtotal | numeric | YES |  |
| [ ] | acrescimosubtotal | numeric | YES |  |
| [ ] | origem | smallint | YES |  |
| [ ] | tipokit | smallint | YES |  |
| [ ] | idprodutokit | bigint | YES |  |
| [ ] | comissao | numeric | YES |  |
| [ ] | tributacaoespecial | character varying(7) | YES |  |
| [ ] | percentualdesconto | numeric | YES |  |
| [ ] | descontopromocao | numeric | YES |  |
| [ ] | informacaoadicional | character varying(500) | YES |  |
| [ ] | basepis | numeric | YES |  |
| [ ] | cstpis | character varying(2) | YES |  |
| [ ] | aliquotapis | numeric | YES |  |
| [ ] | pis | numeric | YES |  |
| [ ] | basecofins | numeric | YES |  |
| [ ] | cstcofins | character varying(2) | YES |  |
| [ ] | aliquotacofins | numeric | YES |  |
| [ ] | cofins | numeric | YES |  |
| [ ] | codigolistalc11603 | character varying(6) | YES |  |
| [ ] | produtoespecifico | smallint | YES |  |
| [ ] | tipooperacao | smallint | YES |  |
| [ ] | chassi | character varying(17) | YES |  |
| [ ] | cor | character varying(4) | YES |  |
| [ ] | descricaocor | character varying(40) | YES |  |
| [ ] | potenciamotor | character varying(4) | YES |  |
| [ ] | cm3 | character varying(4) | YES |  |
| [ ] | pesoliquidoveiculo | character varying(9) | YES |  |
| [ ] | pesobrutoveiculo | character varying(9) | YES |  |
| [ ] | serial | character varying(9) | YES |  |
| [ ] | tipocombustivel | character varying(8) | YES |  |
| [ ] | numeromotor | character varying(21) | YES |  |
| [ ] | cmkg | character varying(9) | YES |  |
| [ ] | distanciaeixos | character varying(4) | YES |  |
| [ ] | renavam | character varying(11) | YES |  |
| [ ] | anomodelofabricacao | smallint | YES |  |
| [ ] | anofabricacao | smallint | YES |  |
| [ ] | tipopintura | character varying(1) | YES |  |
| [ ] | tipoveiculo | smallint | YES |  |
| [ ] | especieveiculo | smallint | YES |  |
| [ ] | vim | character varying(1) | YES |  |
| [ ] | condicaoveiculo | smallint | YES |  |
| [ ] | codigomarcamodelo | numeric | YES |  |
| [ ] | modalidadeicmsst | smallint | YES |  |
| [ ] | margemvaloradicionado | numeric | YES |  |
| [ ] | funrural | numeric | YES |  |
| [ ] | idpromocao | bigint | YES |  |
| [ ] | percentualretencaoiss | numeric | YES |  |
| [ ] | retencaoiss | numeric | YES |  |
| [ ] | situacaotributariaipi | character varying(3) | YES |  |
| [ ] | modocalculoipi | smallint | YES | 0 |
| [ ] | frete | numeric | YES |  |
| [ ] | seguro | numeric | YES |  |
| [ ] | outrasdespesas | numeric | YES |  |
| [ ] | descontofinanciamento | numeric | YES |  |
| [ ] | acrescimofinanciamento | numeric | YES |  |
| [ ] | descontoclienteprodutoaplicado | smallint | YES |  |
| [ ] | percentualreducaomva | numeric | YES |  |
| [ ] | percentualreducaoicmssubstituicao | numeric | YES |  |
| [ ] | situacaotributariasn | character varying(3) | YES |  |
| [ ] | percentualicmsaproveitamento | numeric | YES |  |
| [ ] | valoricmsaproveitamento | numeric | YES |  |
| [ ] | cilindrada | character varying(4) | YES |  |
| [ ] | cordenatran | character varying(2) | YES |  |
| [ ] | lotacao | smallint | YES |  |
| [ ] | tiporestricao | smallint | YES |  |
| [ ] | percentualfunrural | numeric | YES |  |
| [ ] | cnpjconcessionaria | character varying(18) | YES |  |
| [ ] | veiculonovo | smallint | YES |  |
| [ ] | idestadoconcessionaria | bigint | YES |  |
| [ ] | iddavitem | bigint | YES |  |
| [ ] | idpedidocompraitem | bigint | YES |  |
| [ ] | tipovalordesconto | smallint | YES |  |
| [ ] | tipovaloripi | smallint | YES |  |
| [ ] | embalagem | numeric | YES |  |
| [ ] | naoconsiderarvalortotalnota | smallint | YES |  |
| [ ] | despesasimportacao | numeric | YES |  |
| [ ] | valoricmsstinformadomanualmente | smallint | YES |  |
| [ ] | precobruto | numeric | YES |  |
| [ ] | idusuariodesconto | bigint | YES |  |
| [ ] | percentualicmsdiferido | numeric | YES |  |
| [ ] | baseicmsdiferido | numeric | YES |  |
| [ ] | percentualreducaoicmsdiferido | numeric | YES |  |
| [ ] | icmsdiferido | numeric | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | idunidademedida | bigint | YES |  |
| [ ] | percreducaoicmssubstituicao | numeric | YES |  |
| [ ] | situacaotributariadigitada | character varying(3) | YES |  |
| [ ] | icmsstinformadomanualmente | smallint | YES |  |
| [ ] | tributamunicipioprestador | smallint | YES |  |
| [ ] | precocusto | numeric | YES |  |
| [ ] | customedio | numeric | YES |  |
| [ ] | idbasecalculocredito | bigint | YES |  |
| [ ] | idcontribuicaosocialapurada | bigint | YES |  |
| [ ] | idreceitasemcontribuicao | bigint | YES |  |
| [ ] | idtipocredito | bigint | YES |  |
| [ ] | vendaentregafutura | smallint | YES |  |
| [ ] | numeropedidocompra | character varying(15) | YES |  |
| [ ] | numeroitempedidocompra | character varying(6) | YES |  |
| [ ] | baseimpostoimportacao | numeric | YES |  |
| [ ] | despesasaduaneiras | numeric | YES |  |
| [ ] | impostoimportacao | numeric | YES |  |
| [ ] | iof | numeric | YES |  |
| [ ] | idembalagem | bigint | YES |  |
| [ ] | baseicmsstanterior | numeric | YES |  |
| [ ] | valoricmsstanterior | numeric | YES |  |
| [ ] | percentualicmsnaoaproveitado | numeric | YES |  |
| [ ] | baseicmsnaoaproveitado | numeric | YES |  |
| [ ] | percentualreducaoicmsnaoaprov | numeric | YES |  |
| [ ] | icmsnaoaproveitado | numeric | YES |  |
| [ ] | placaveiculo | character varying(8) | YES |  |
| [ ] | itemnotafiscalseraentregue | smallint | YES |  |
| [ ] | itemnotafiscalseraretirado | smallint | YES |  |
| [ ] | idfilialretiradaentrega | bigint | YES |  |
| [ ] | baseipi | numeric | YES |  |
| [ ] | idcontribuicaosocialapurcofins | bigint | YES |  |
| [ ] | reterpiscofins | smallint | YES |  |
| [ ] | perccontribuicaosocial | numeric | YES |  |
| [ ] | contribuicaosocial | numeric | YES |  |
| [ ] | percimpostorenda | numeric | YES |  |
| [ ] | impostorenda | numeric | YES |  |
| [ ] | percinss | numeric | YES |  |
| [ ] | inss | numeric | YES |  |
| [ ] | tipovaloricms | smallint | YES |  |
| [ ] | percoutrosvalorespreco | numeric | YES |  |
| [ ] | outrosimpostoscusto | numeric | YES |  |
| [ ] | outrosimpostospreco | numeric | YES |  |
| [ ] | valoricmsstentrada | numeric | YES |  |
| [ ] | custooperacional | numeric | YES |  |
| [ ] | lucrobruto | numeric | YES |  |
| [ ] | precovendaajustado | numeric | YES |  |
| [ ] | freteoutrasdespesas | numeric | YES |  |
| [ ] | valoricmssaida | numeric | YES |  |
| [ ] | modocalculopreco | smallint | YES |  |
| [ ] | idncm | bigint | YES |  |
| [ ] | baseimpostoaproximado | numeric | YES |  |
| [ ] | percimpostoaproximado | numeric | YES |  |
| [ ] | impostoaproximado | numeric | YES |  |
| [ ] | percentualoutrosvalorescusto | numeric | YES |  |
| [ ] | outrosvalorescusto | numeric | YES |  |
| [ ] | aliquotapiscofinssaidapreco | numeric | YES |  |
| [ ] | percentualipisaida | numeric | YES |  |
| [ ] | tiporetiradaentregaitem | smallint | YES |  |
| [ ] | brindeimportado | numeric | YES |  |
| [ ] | idlote | bigint | YES |  |
| [ ] | lote | character varying(30) | YES |  |
| [ ] | datalote | date | YES |  |
| [ ] | itempeps | smallint | YES |  |
| [ ] | comprimento | numeric | YES |  |
| [ ] | largura | numeric | YES |  |
| [ ] | altura | numeric | YES |  |
| [ ] | percentualprecominimovenda | numeric | YES |  |
| [ ] | idsupervisorvenda | bigint | YES |  |
| [ ] | precominimovenda | numeric | YES |  |
| [ ] | idtabelasped | bigint | YES |  |
| [ ] | valorcomplementar | numeric | YES |  |
| [ ] | descricaocomplementar | text | YES |  |
| [ ] | tipotinta | smallint | YES |  |
| [ ] | idprodutobase | bigint | YES |  |
| [ ] | quantidadepeca | bigint | YES |  |
| [ ] | freteconhecimento | numeric | YES |  |
| [ ] | baseicmsconhecimento | numeric | YES |  |
| [ ] | icmsconhecimento | numeric | YES |  |
| [ ] | custototal | numeric | YES |  |
| [ ] | percentualipinaodestacado | numeric | YES |  |
| [ ] | ipinaodestacado | numeric | YES |  |
| [ ] | basepiscofinsconhecimento | numeric | YES |  |
| [ ] | pisconhecimento | numeric | YES |  |
| [ ] | cofinsconhecimento | numeric | YES |  |
| [ ] | pautapreco | smallint | YES |  |
| [ ] | comissaoavista | numeric | YES |  |
| [ ] | comissaoaprazo | numeric | YES |  |
| [ ] | comissaoquitacao | numeric | YES |  |
| [ ] | iddevolucaoitem | bigint | YES |  |
| [ ] | valoroutrosimpostoscusto | numeric | YES |  |
| [ ] | percentuallucroajustado | numeric | YES |  |
| [ ] | percentualmarkupcalculado | numeric | YES |  |
| [ ] | percentualmarkupajustado | numeric | YES |  |
| [ ] | dataprogramacaopreco | date | YES |  |
| [ ] | aplicaprecocalculado | smallint | YES |  |
| [ ] | gerarcreditoicmsst | smallint | YES |  |
| [ ] | gerarcreditoipi | smallint | YES |  |
| [ ] | valorimpostosincentivados | numeric | YES |  |
| [ ] | valorpisincentivado | numeric | YES |  |
| [ ] | valorcofinsincentivado | numeric | YES |  |
| [ ] | valoricmsincentivado | numeric | YES |  |
| [ ] | aliquotapisincentivado | numeric | YES |  |
| [ ] | aliquotacofinsincentivado | numeric | YES |  |
| [ ] | aliquotaicmsincentivado | numeric | YES |  |
| [ ] | taxasiscomex | numeric | YES |  |
| [ ] | percimpostoaproximadomunicipal | numeric | YES |  |
| [ ] | impostoaproximadomunicipal | numeric | YES |  |
| [ ] | percimpostoaproximadoestadual | numeric | YES |  |
| [ ] | impostoaproximadoestadual | numeric | YES |  |
| [ ] | percimpostoaproximadofederal | numeric | YES |  |
| [ ] | impostoaproximadofederal | numeric | YES |  |
| [ ] | chaveibpt | character varying(6) | YES |  |
| [ ] | fonteibpt | character varying(50) | YES |  |
| [ ] | enviartagsdiferimentototal | smallint | YES |  |
| [ ] | referenciafornecedor | character varying(60) | YES |  |
| [ ] | motivodesoneracaoicms | smallint | YES |  |
| [ ] | motivodesoneracaopis | smallint | YES |  |
| [ ] | motivodesoneracaocofins | smallint | YES |  |
| [ ] | retirado | smallint | YES |  |
| [ ] | idusuarioretirada | bigint | YES |  |
| [ ] | datahoraretirada | timestamp without time zone | YES |  |
| [ ] | percentualicmsdestino | numeric | YES |  |
| [ ] | percentualpartilhaicmsestados | numeric | YES |  |
| [ ] | icmsdestino | numeric | YES |  |
| [ ] | icmsremetente | numeric | YES |  |
| [ ] | percentualicmsfundopobreza | numeric | YES |  |
| [ ] | icmsfundopobreza | numeric | YES |  |
| [ ] | basecalculoicmsdifal | numeric | YES |  |
| [ ] | percentualicmsinterestadual | numeric | YES |  |
| [ ] | replicarformacao | smallint | YES |  |
| [ ] | replicarcusto | smallint | YES |  |
| [ ] | idenquadramentoipi | bigint | YES |  |
| [ ] | idativoimobilizado | bigint | YES |  |
| [ ] | quantidadehora | character varying(5) | YES |  |
| [ ] | naopossuiicmsstnotaorigem | smallint | YES |  |
| [ ] | precovendaajustadopauta1 | numeric | YES |  |
| [ ] | precovendaajustadopauta2 | numeric | YES |  |
| [ ] | precovendaajustadopauta3 | numeric | YES |  |
| [ ] | precovendaajustadopauta4 | numeric | YES |  |
| [ ] | valordiferencaimportacaoxml | numeric | YES |  |
| [ ] | valorvendor | numeric | YES |  |
| [ ] | idrequisicaotransferenciaitem | bigint | YES |  |
| [ ] | baseimpostorenda | numeric | YES |  |
| [ ] | basecontribuicaosocial | numeric | YES |  |
| [ ] | baseinss | numeric | YES |  |
| [ ] | aliquotapisretido | numeric | YES |  |
| [ ] | aliquotacofinsretido | numeric | YES |  |
| [ ] | basepisretido | numeric | YES |  |
| [ ] | basecofinsretido | numeric | YES |  |
| [ ] | pisretido | numeric | YES |  |
| [ ] | cofinsretido | numeric | YES |  |
| [ ] | valoricmsdiferencialentrada | numeric | YES |  |
| [ ] | aliquotaicmsdiferencialentrada | numeric | YES |  |
| [ ] | idobservacaolancamentofiscal | bigint | YES |  |
| [ ] | idajustedocumentofiscal | bigint | YES |  |
| [ ] | numeroregistroexportacao | character varying(12) | YES |  |
| [ ] | chavenferecebidaexportacao | character varying(44) | YES |  |
| [ ] | numerodrawback | character varying(20) | YES |  |
| [ ] | statusprecoitem | smallint | YES |  |
| [ ] | valorlancamentospedcusto | numeric | YES |  |
| [ ] | cargatributariamedia | numeric | YES |  |
| [ ] | idembalagemtributavel | bigint | YES |  |
| [ ] | idunidademedidatributavel | bigint | YES |  |
| [ ] | quantidadetributavel | numeric | YES |  |
| [ ] | percredbasepiscofins | numeric | YES |  |
| [ ] | cnpjemissor | character varying(14) | YES |  |
| [ ] | emissao | date | YES |  |
| [ ] | totalizadorparcial | character varying(10) | YES |  |
| [ ] | decimaisquantidade | smallint | YES |  |
| [ ] | decimaispreco | smallint | YES |  |
| [ ] | numeronotafiscal | character varying(11) | YES |  |
| [ ] | serie | character varying(4) | YES |  |
| [ ] | chavenfe | character varying(44) | YES |  |
| [ ] | tipodocumentopaf | character varying(1) | YES |  |
| [ ] | hash | bigint | YES |  |
| [ ] | comissaopreco | numeric | YES |  |
| [ ] | basefundopobrezast | numeric | YES |  |
| [ ] | percentualicmsfundopobrezast | numeric | YES |  |
| [ ] | icmsfundopobrezast | numeric | YES |  |
| [ ] | basefundopobrezainterno | numeric | YES |  |
| [ ] | percicmsfundopobrezainterno | numeric | YES |  |
| [ ] | icmsfundopobrezainterno | numeric | YES |  |
| [ ] | basefcpstanterior | numeric | YES |  |
| [ ] | valorfcpstanterior | numeric | YES |  |
| [ ] | percentualmercadoriadevolvida | numeric | YES |  |
| [ ] | idrepresentante2 | bigint | YES |  |
| [ ] | detalhenfe | bytea | YES |  |
| [ ] | valorafrmm | numeric | YES |  |
| [ ] | itemorigempossuipis | smallint | YES |  |
| [ ] | itemorigempossuicofins | smallint | YES |  |
| [ ] | itemorigempossuiicms | smallint | YES |  |
| [ ] | itemorigempossuiipi | smallint | YES |  |
| [ ] | basestufdestino | numeric | YES |  |
| [ ] | valorstufdestino | numeric | YES |  |
| [ ] | precificado | smallint | YES |  |
| [ ] | custoadicional | numeric | YES |  |
| [ ] | icmsdiferencialcomporpreco | numeric | YES |  |
| [ ] | percicmsdiferencialcomporpreco | numeric | YES |  |
| [ ] | statusremessaterceiros | smallint | YES |  |
| [ ] | idnotafiscalitemterceiros | bigint | YES |  |
| [ ] | entidadenotafiscalterceiros | character varying(60) | YES |  |
| [ ] | numeronotafiscalterceiros | character varying(11) | YES |  |
| [ ] | rebaixa | numeric | YES |  |
| [ ] | baseicmsefetivo | numeric | YES |  |
| [ ] | aliquotaicmsefetivo | numeric | YES |  |
| [ ] | percentualredbaseicmsefetivo | numeric | YES |  |
| [ ] | valoricmsefetivo | numeric | YES |  |
| [ ] | aliquotafcpstanterior | numeric | YES |  |
| [ ] | aliquotaicmsstanterior | numeric | YES |  |
| [ ] | valoricmssubstituto | numeric | YES |  |
| [ ] | idbeneficiofiscal | bigint | YES |  |
| [ ] | codigobeneficiofiscal | character varying(10) | YES |  |
| [ ] | motivodesoneracaoicmssemdesc | smallint | YES |  |
| [ ] | baseicmsdesoneradosemdesconto | numeric | YES |  |
| [ ] | aliquotaicmsdesoneradosemdesc | numeric | YES |  |
| [ ] | valoricmsdesoneradosemdesconto | numeric | YES |  |
| [ ] | aliquotareducaobasecalculoinss | numeric | YES |  |
| [ ] | basefcpinternonaoaproveitado | numeric | YES |  |
| [ ] | icmsfcpinternonaoaprovaitado | numeric | YES |  |
| [ ] | percfcpinternonaoaproveitado | numeric | YES |  |
| [ ] | identidadedesconto | bigint | YES |  |
| [ ] | cfop | character varying(20) | YES |  |
| [ ] | idnotafiscalitemdevolvido | bigint | YES |  |
| [ ] | quantidadepauta1 | numeric | YES |  |
| [ ] | quantidadepauta2 | numeric | YES |  |
| [ ] | quantidadepauta3 | numeric | YES |  |
| [ ] | quantidadepauta4 | numeric | YES |  |
| [ ] | unidademedidaxml | character varying(6) | YES |  |
| [ ] | baseicmsstpresumido | numeric | YES |  |
| [ ] | aliquotaicmsstpresumido | numeric | YES |  |
| [ ] | valoricmsstpresumido | numeric | YES |  |
| [ ] | baseicmspresumido | numeric | YES |  |
| [ ] | aliquotaicmspresumido | numeric | YES |  |
| [ ] | valoricmspresumido | numeric | YES |  |
| [ ] | custoaquisicao | numeric | YES |  |
| [ ] | pontoequilibrio | numeric | YES |  |
| [ ] | marcaveiculo | character varying(20) | YES |  |
| [ ] | percentuallucrominimo | numeric | YES |  |
| [ ] | percentuallucromaximo | numeric | YES |  |
| [ ] | tipoarma | smallint | YES |  |
| [ ] | numeroseriearma | character varying(15) | YES |  |
| [ ] | numeroseriecanoarma | character varying(15) | YES |  |
| [ ] | descricaoarma | character varying(256) | YES |  |
| [ ] | percentualreducaoicmsvirtual | numeric | YES |  |
| [ ] | baseicmsvirtual | numeric | YES |  |
| [ ] | percentualicmsvirtual | numeric | YES |  |
| [ ] | icmsvirtual | numeric | YES |  |
| [ ] | basefundopobrezainternovirtual | numeric | YES |  |
| [ ] | percicmsfundopobinternovirtual | numeric | YES |  |
| [ ] | icmsfundopobrezainternovirtual | numeric | YES |  |
| [ ] | observacaorebaixa | text | YES |  |
| [ ] | idmotivorebaixa | bigint | YES |  |
| [ ] | valorlancamentospedcustodebito | numeric | YES |  |
| [ ] | cmvatual | numeric | YES |  |
| [ ] | deducaoicmsbasepis | numeric | YES |  |
| [ ] | deducaoicmsbasecofins | numeric | YES |  |
| [ ] | numerolote | character varying(30) | YES |  |
| [ ] | fabricacaolote | date | YES |  |
| [ ] | vencimentolote | date | YES |  |
| [ ] | codigoanvisa | character varying(13) | YES |  |
| [ ] | motivoisencaocodigoanvisa | character varying(255) | YES |  |
| [ ] | precomaximoconsumidor | numeric | YES |  |
| [ ] | baseicmsmonoproprio | numeric | YES |  |
| [ ] | aliquotaicmsmonoproprio | numeric | YES |  |
| [ ] | valoricmsmonoproprio | numeric | YES |  |
| [ ] | baseicmsmonoretencao | numeric | YES |  |
| [ ] | aliquotaicmsmonoretencao | numeric | YES |  |
| [ ] | valoricmsmonoretencao | numeric | YES |  |
| [ ] | baseicmsmonodiferido | numeric | YES |  |
| [ ] | aliquotaicmsmonodiferido | numeric | YES |  |
| [ ] | valoricmsmonodiferido | numeric | YES |  |
| [ ] | baseicmsmonoretanterior | numeric | YES |  |
| [ ] | aliquotaicmsmonoretanterior | numeric | YES |  |
| [ ] | valoricmsmonoretanterior | numeric | YES |  |
| [ ] | idlocalestoqueretiradaentrega | bigint | YES |  |
| [ ] | numeroadicaoimp | smallint | YES |  |
| [ ] | numerosequencialadicaoimp | smallint | YES |  |
| [ ] | codigofabricanteimp | character varying(60) | YES |  |
| [ ] | ipiorigemdevolucao | numeric | YES |  |
| [ ] | baseipiorigemdevolucao | numeric | YES |  |
| [ ] | icmsstorigemdevolucao | numeric | YES |  |
| [ ] | baseicmsstorigemdevolucao | numeric | YES |  |
| [ ] | tributacaoissnacional | character varying(1) | YES |  |
| [ ] | numerobeneficioissnacional | character varying(14) | YES |  |
| [ ] | tiposuspensaoissnacional | character varying(1) | YES |  |
| [ ] | tipoimunidadeissnacional | character varying(1) | YES |  |
| [ ] | tiporetencaoissnacional | character varying(1) | YES |  |
| [ ] | numeroprocessoissnacional | character varying(30) | YES |  |
| [ ] | statusdesmontagem | character(1) | YES |  |
| [ ] | idusuarioalteracaoretentrega | bigint | YES |  |
| [ ] | percentualpauta1 | numeric | YES |  |
| [ ] | percentualpauta2 | numeric | YES |  |
| [ ] | percentualpauta3 | numeric | YES |  |
| [ ] | percentualpauta4 | numeric | YES |  |
| [ ] | idbeneficiofiscalred51 | bigint | YES |  |
| [ ] | icmsorigem | numeric | YES |  |
| [ ] | baseicmsorigem | numeric | YES |  |
| [ ] | percentualicmsorigem | numeric | YES |  |
| [ ] | aliquotareducaoicmsorigem | numeric | YES |  |
| [ ] | referencia | character varying(60) | YES |  |
| [ ] | baseicmspresumidonfe | numeric | YES |  |
| [ ] | aliquotaicmspresumidonfe | numeric | YES |  |
| [ ] | valoricmspresumidonfe | numeric | YES |  |
| [ ] | idbeneficiofiscalcredpresu | bigint | YES |  |
| [ ] | cstibscbs | character varying(3) | YES |  |
| [ ] | idclassificacaotributaria | bigint | YES |  |
| [ ] | codigoclassificacaotributaria | character varying(6) | YES |  |
| [ ] | basecalculoibscbs | numeric | YES |  |
| [ ] | aliquotaibsuf | numeric | YES |  |
| [ ] | reducaoaliquotaibsuf | numeric | YES |  |
| [ ] | aliquotaefetivaibsuf | numeric | YES |  |
| [ ] | valoribsuf | numeric | YES |  |
| [ ] | aliquotaibsmun | numeric | YES |  |
| [ ] | reducaoaliquotaibsmun | numeric | YES |  |
| [ ] | aliquotaefetivaibsmun | numeric | YES |  |
| [ ] | valoribsmun | numeric | YES |  |
| [ ] | aliquotacbs | numeric | YES |  |
| [ ] | reducaoaliquotacbs | numeric | YES |  |
| [ ] | aliquotaefetivacbs | numeric | YES |  |
| [ ] | valorcbs | numeric | YES |  |
| [ ] | valoribs | numeric | YES |  |
| [ ] | cstibscbsreg | character varying(3) | YES |  |
| [ ] | idclassificacaotributariareg | bigint | YES |  |
| [ ] | codigoclassificacaotribreg | character varying(6) | YES |  |
| [ ] | basecalculoibscbsreg | numeric | YES |  |
| [ ] | valoribsufreg | numeric | YES |  |
| [ ] | valoribsmunreg | numeric | YES |  |
| [ ] | valoribsreg | numeric | YES |  |
| [ ] | valorcbsreg | numeric | YES |  |
| [ ] | aliquotaibsufreg | numeric | YES |  |
| [ ] | redaliquotaibsufreg | numeric | YES |  |
| [ ] | aliquotaefetibsufreg | numeric | YES |  |
| [ ] | aliquotaibsmunreg | numeric | YES |  |
| [ ] | redaliquotaibsmunreg | numeric | YES |  |
| [ ] | aliquotaefetibsmunreg | numeric | YES |  |
| [ ] | aliquotacbsreg | numeric | YES |  |
| [ ] | reducaoaliquotacbsreg | numeric | YES |  |
| [ ] | aliquotaefetivacbsreg | numeric | YES |  |
| [ ] | valoribsufdiferido | numeric | YES |  |
| [ ] | percentualibsufdiferido | numeric | YES |  |
| [ ] | valoribsmundiferido | numeric | YES |  |
| [ ] | percentualibsmundiferido | numeric | YES |  |
| [ ] | valorcbsdiferido | numeric | YES |  |
| [ ] | percentualcbsdiferido | numeric | YES |  |
| [ ] | quantidademonoretibscbs | numeric | YES |  |
| [ ] | aliquotamonoretibs | numeric | YES |  |
| [ ] | valormonoretibs | numeric | YES |  |
| [ ] | aliquotamonoretcbs | numeric | YES |  |
| [ ] | valormonoretcbs | numeric | YES |  |
| [ ] | idnotafiscalitemreferenciado | bigint | YES |  |
| [ ] | chavenfereferenciada | character varying(44) | YES |  |
| [ ] | numeroitemreferenciado | smallint | YES |  |
| [ ] | grupotransferenciacredito | smallint | YES |  |
| [ ] | grupoestornocredito | smallint | YES |  |
| [ ] | grupoajustecompetencia | smallint | YES |  |
| [ ] | percfcpinternodiferido | numeric | YES |  |
| [ ] | valorfcpinternodiferido | numeric | YES |  |
| [ ] | valorfcpinternosemdif | numeric | YES |  |

# Colunas de "operacao_nfce_view" (29 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | YES |  |
| [ ] | data | date | YES |  |
| [ ] | filial | character varying(4) | YES |  |
| [ ] | tipo | smallint | YES |  |
| [ ] | tipoambientenfce | smallint | YES |  |
| [ ] | horafinal | timestamp without time zone | YES |  |
| [ ] | pdv | smallint | YES |  |
| [ ] | valorbruto | numeric | YES |  |
| [ ] | valorliquido | numeric | YES |  |
| [ ] | descontoitem | numeric | YES |  |
| [ ] | descontopromocao | numeric | YES |  |
| [ ] | descontosubtotal | numeric | YES |  |
| [ ] | tempoautorizacao | integer | YES |  |
| [ ] | formaemissaonfce | integer | YES |  |
| [ ] | modelonfce | character varying(4) | YES |  |
| [ ] | serienfce | character varying(4) | YES |  |
| [ ] | numeronfce | character varying(11) | YES |  |
| [ ] | chaveacessonfce | character varying(44) | YES |  |
| [ ] | statusnfce | smallint | YES |  |
| [ ] | numeroprotocolonfce | character varying(18) | YES |  |
| [ ] | numeronfcependente | character varying | YES |  |
| [ ] | cliente | character varying(14) | YES |  |
| [ ] | consumidornome | character varying(60) | YES |  |
| [ ] | consumidorcpfcnpj | character varying(20) | YES |  |
| [ ] | numerosubstituido | integer | YES |  |
| [ ] | vendedor | character varying(14) | YES |  |
| [ ] | horatransmissao | timestamp without time zone | YES |  |
| [ ] | consumidortelefone | character varying(15) | YES |  |
| [ ] | statusprocessamento | smallint | YES |  |

# Colunas de "produto" (569 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('produto_id_seq'::regclass) |
| [ ] | codigo | character varying(20) | NO |  |
| [ ] | ean | character varying(20) | YES |  |
| [ ] | inativo | smallint | YES | 0 |
| [ ] | nome | character varying(120) | YES |  |
| [ ] | nomeecf | character varying(120) | YES |  |
| [ ] | tipo | character(1) | YES |  |
| [ ] | idfornecedor | bigint | YES |  |
| [ ] | fornecedor | character varying(14) | YES |  |
| [ ] | idunidademedida | bigint | YES |  |
| [ ] | unidademedida | character varying(6) | YES |  |
| [ ] | lucrobruto | numeric | YES |  |
| [ ] | preco | numeric | YES | 0.000 |
| [ ] | precopauta1 | numeric | YES |  |
| [ ] | precopauta2 | numeric | YES |  |
| [ ] | precopauta3 | numeric | YES |  |
| [ ] | precopauta4 | numeric | YES |  |
| [ ] | precous | numeric | YES |  |
| [ ] | peso | numeric | YES |  |
| [ ] | numeroserie | smallint | YES |  |
| [ ] | tributacao | character varying(7) | YES |  |
| [ ] | observacao | text | YES |  |
| [ ] | idhierarquia | bigint | YES |  |
| [ ] | hierarquia | character varying(30) | YES |  |
| [ ] | kit | smallint | YES |  |
| [ ] | endereco | character varying(50) | YES |  |
| [ ] | tabelafinanciamento | character varying(6) | YES |  |
| [ ] | datacadastro | timestamp without time zone | YES |  |
| [ ] | dataalteracao | timestamp without time zone | YES |  |
| [ ] | comissao | numeric | YES | 0.00 |
| [ ] | ipi | numeric | YES |  |
| [ ] | fatorconversao | numeric | YES | 0.000 |
| [ ] | idunidademedidacompra | bigint | YES |  |
| [ ] | idclassificacaofiscal | bigint | YES |  |
| [ ] | situacaotributaria | character varying(3) | YES |  |
| [ ] | precocusto | numeric | YES | 0.000 |
| [ ] | dataprecocusto | date | YES |  |
| [ ] | customedio | numeric | YES |  |
| [ ] | quantidademinima | numeric | YES |  |
| [ ] | quantidademaxima | numeric | YES |  |
| [ ] | dataultimavenda | date | YES |  |
| [ ] | extra1 | character varying(512) | YES |  |
| [ ] | extra2 | character varying(512) | YES |  |
| [ ] | extra3 | character varying(512) | YES |  |
| [ ] | extra4 | character varying(512) | YES |  |
| [ ] | extra5 | character varying(512) | YES |  |
| [ ] | extra6 | character varying(512) | YES |  |
| [ ] | iat | character(1) | YES |  |
| [ ] | ippt | character(1) | YES |  |
| [ ] | origem | smallint | YES |  |
| [ ] | imagem | bytea | YES |  |
| [ ] | icmsentrada | numeric | YES |  |
| [ ] | custoindireto | numeric | YES |  |
| [ ] | atualizacaopreco | date | YES |  |
| [ ] | diasvencimento | smallint | YES |  |
| [ ] | departamento | smallint | YES |  |
| [ ] | extrabalanca1 | character varying(100) | YES |  |
| [ ] | extrabalanca2 | character varying(100) | YES |  |
| [ ] | extrabalanca3 | character varying(100) | YES |  |
| [ ] | extrabalanca4 | character varying(100) | YES |  |
| [ ] | extrabalanca5 | character varying(100) | YES |  |
| [ ] | pesavel | smallint | YES |  |
| [ ] | nutricionais | smallint | YES |  |
| [ ] | porcao | character varying(35) | YES |  |
| [ ] | valorenergetico | smallint | YES |  |
| [ ] | carboidratos | smallint | YES |  |
| [ ] | proteinas | smallint | YES |  |
| [ ] | gordurastotais | smallint | YES |  |
| [ ] | gordurassaturadas | smallint | YES |  |
| [ ] | gordurastrans | smallint | YES |  |
| [ ] | fibraalimentar | smallint | YES |  |
| [ ] | sodio | smallint | YES |  |
| [ ] | casasdecimais | smallint | YES |  |
| [ ] | funrural | smallint | YES |  |
| [ ] | tributacaoespecial | character varying(7) | YES |  |
| [ ] | tipoporcao | smallint | YES |  |
| [ ] | ncm | character varying(10) | YES |  |
| [ ] | codigolistalc11603 | character varying(5) | YES |  |
| [ ] | produtoespecifico | smallint | YES |  |
| [ ] | codigoexcecaoncm | character varying(3) | YES |  |
| [ ] | tipoproduto | character varying(2) | YES |  |
| [ ] | codigogenero | character varying(3) | YES |  |
| [ ] | codigoservico | character varying(60) | YES |  |
| [ ] | freteoutrasdespesas | numeric | YES |  |
| [ ] | ipiultimanota | numeric | YES |  |
| [ ] | outrosimpostoscusto | numeric | YES |  |
| [ ] | outrosimpostospreco | numeric | YES |  |
| [ ] | modalidadeicmsst | smallint | YES |  |
| [ ] | valoricmsst | numeric | YES |  |
| [ ] | referencia | character varying(60) | YES |  |
| [ ] | registroimportado | smallint | YES |  |
| [ ] | casasdecimaisprecocusto | smallint | YES |  |
| [ ] | comissaoavista | numeric | YES |  |
| [ ] | comissaoaprazo | numeric | YES |  |
| [ ] | idimagemetiqueta | bigint | YES |  |
| [ ] | modocalculopreco | smallint | YES | 0 |
| [ ] | percentualmarkup | numeric | YES |  |
| [ ] | cstpis | character varying(2) | YES |  |
| [ ] | cstcofins | character varying(2) | YES |  |
| [ ] | aliquotapis | numeric | YES |  |
| [ ] | aliquotacofins | numeric | YES |  |
| [ ] | situacaotributariaipi | character varying(3) | YES |  |
| [ ] | modocalculoipi | smallint | YES | 0 |
| [ ] | cstservico | character varying(3) | YES |  |
| [ ] | itemrapido | smallint | YES | 0 |
| [ ] | venderpeloprecototal | smallint | YES | 0 |
| [ ] | pesoliquido | numeric | YES |  |
| [ ] | destinocomanda | smallint | YES |  |
| [ ] | dataultimacompra | date | YES |  |
| [ ] | percentualreducaomva | numeric | YES |  |
| [ ] | hash | bigint | YES |  |
| [ ] | icmsstentrada | numeric | YES |  |
| [ ] | codigocnae | character varying(9) | YES |  |
| [ ] | precoultimacompra | numeric | YES |  |
| [ ] | aliquotaicmsinterna | numeric | YES |  |
| [ ] | situacaotributariasn | character varying(3) | YES |  |
| [ ] | ultimabaseicmsst | numeric | YES |  |
| [ ] | ultimovaloricmsst | numeric | YES |  |
| [ ] | utilizatagadicional | smallint | YES |  |
| [ ] | idunidademedidaproducao | bigint | YES |  |
| [ ] | fatorconversaoproducao | numeric | YES |  |
| [ ] | idtabelamva | bigint | YES |  |
| [ ] | produtoseramodelofichatecnica | smallint | YES |  |
| [ ] | tipocustoformarprecovendo | smallint | YES |  |
| [ ] | tipovalorcustoformacaoprecovenda | smallint | YES |  |
| [ ] | ultimodescontonotaentrada | numeric | YES |  |
| [ ] | codigosupply | character varying(4) | YES |  |
| [ ] | percentualmaximodesconto | numeric | YES |  |
| [ ] | percentualmaximoacrescimo | numeric | YES |  |
| [ ] | icmssaida | numeric | YES |  |
| [ ] | pedevendedor | smallint | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | reducaoicmsentrada | numeric | YES |  |
| [ ] | naturezareceita | character varying(3) | YES |  |
| [ ] | idfabricante | bigint | YES |  |
| [ ] | cstpisentrada | character varying(2) | YES |  |
| [ ] | aliquotapisentrada | numeric | YES |  |
| [ ] | cstcofinsentrada | character varying(2) | YES |  |
| [ ] | aliquotacofinsentrada | numeric | YES |  |
| [ ] | tipovalorcustoformprecovenda | smallint | YES |  |
| [ ] | possuivariacao | smallint | YES |  |
| [ ] | podeserbrinde | smallint | YES |  |
| [ ] | idcfopentrada | bigint | YES |  |
| [ ] | idcfopsaida | bigint | YES |  |
| [ ] | idcfopentradaexterna | bigint | YES |  |
| [ ] | idcfopsaidaexterna | bigint | YES |  |
| [ ] | idpontoimpressao | bigint | YES |  |
| [ ] | codigopetrocard | character varying(3) | YES |  |
| [ ] | utilizacrm | smallint | YES |  |
| [ ] | idplanocontas | bigint | YES |  |
| [ ] | imprimedatavalidade | smallint | YES |  |
| [ ] | imprimedataembalagem | smallint | YES |  |
| [ ] | idbasecalculocredito | bigint | YES |  |
| [ ] | idreceitasemcontribuicao | bigint | YES |  |
| [ ] | idcontribuicaosocialapurada | bigint | YES |  |
| [ ] | idtipocredito | bigint | YES |  |
| [ ] | fatorconversaoalternativo | numeric | YES |  |
| [ ] | idunidademedidaalternativa | bigint | YES |  |
| [ ] | aliquotapiscofinsentradapreco | numeric | YES |  |
| [ ] | aliquotapiscofinssaidapreco | numeric | YES |  |
| [ ] | quantidadepadrao | numeric | YES |  |
| [ ] | quantidadealternativa | numeric | YES |  |
| [ ] | receitafichatecnica | character varying(4096) | YES |  |
| [ ] | dataalteracaopreco | timestamp without time zone | YES |  |
| [ ] | dataalteracaoprecopauta1 | timestamp without time zone | YES |  |
| [ ] | dataalteracaoprecopauta2 | timestamp without time zone | YES |  |
| [ ] | dataalteracaoprecopauta3 | timestamp without time zone | YES |  |
| [ ] | dataalteracaoprecopauta4 | timestamp without time zone | YES |  |
| [ ] | dataimpetiquetapreco | timestamp without time zone | YES |  |
| [ ] | dataimpetiquetaprecopauta1 | timestamp without time zone | YES |  |
| [ ] | dataimpetiquetaprecopauta2 | timestamp without time zone | YES |  |
| [ ] | dataimpetiquetaprecopauta3 | timestamp without time zone | YES |  |
| [ ] | dataimpetiquetaprecopauta4 | timestamp without time zone | YES |  |
| [ ] | tipoquantidade | smallint | YES |  |
| [ ] | tipooperacao | smallint | YES |  |
| [ ] | chassi | character varying(17) | YES |  |
| [ ] | cor | character varying(4) | YES |  |
| [ ] | descricaocor | character varying(40) | YES |  |
| [ ] | potenciamotor | character varying(4) | YES |  |
| [ ] | cm3 | character varying(4) | YES |  |
| [ ] | cilindrada | character varying(4) | YES |  |
| [ ] | pesoliquidoveiculo | character varying(9) | YES |  |
| [ ] | pesobrutoveiculo | character varying(9) | YES |  |
| [ ] | serial | character varying(9) | YES |  |
| [ ] | tipocombustivel | character varying(8) | YES |  |
| [ ] | numeromotor | character varying(21) | YES |  |
| [ ] | cmkg | character varying(9) | YES |  |
| [ ] | distanciaeixos | character varying(4) | YES |  |
| [ ] | renavam | character varying(11) | YES |  |
| [ ] | anomodelofabricacao | smallint | YES |  |
| [ ] | anofabricacao | smallint | YES |  |
| [ ] | tipopintura | character varying(1) | YES |  |
| [ ] | tipoveiculo | smallint | YES |  |
| [ ] | especieveiculo | smallint | YES |  |
| [ ] | vim | character varying(1) | YES |  |
| [ ] | condicaoveiculo | smallint | YES |  |
| [ ] | codigomarcamodelo | numeric | YES |  |
| [ ] | cordenatran | character varying(2) | YES |  |
| [ ] | lotacao | smallint | YES |  |
| [ ] | tiporestricao | smallint | YES |  |
| [ ] | cnpjconcessionaria | character varying(18) | YES |  |
| [ ] | veiculonovo | smallint | YES |  |
| [ ] | idestadoconcessionaria | bigint | YES |  |
| [ ] | customedioinicial | numeric | YES |  |
| [ ] | situacaotributariaipientrada | character varying(3) | YES |  |
| [ ] | alteraprecopdv | smallint | YES |  |
| [ ] | informacaoadicional | character varying(500) | YES |  |
| [ ] | ipientrada | numeric | YES |  |
| [ ] | modocalculoipientrada | smallint | YES |  |
| [ ] | idcontribuicaoprevidenciaria | bigint | YES |  |
| [ ] | placaveiculo | character varying(8) | YES |  |
| [ ] | valortotalcustoadicional | numeric | YES |  |
| [ ] | idcontribuicaosocialapurcofins | bigint | YES |  |
| [ ] | idprodutofracao | bigint | YES |  |
| [ ] | fracao | numeric | YES |  |
| [ ] | quantidadepauta1 | numeric | YES |  |
| [ ] | quantidadepauta2 | numeric | YES |  |
| [ ] | quantidadepauta3 | numeric | YES |  |
| [ ] | quantidadepauta4 | numeric | YES |  |
| [ ] | cartaofidelidadepontos | smallint | YES |  |
| [ ] | percoutrosvalorespreco | numeric | YES |  |
| [ ] | codigoanp | character varying(9) | YES |  |
| [ ] | codigocodif | character varying(21) | YES |  |
| [ ] | idcfopentradadevolucaointerna | bigint | YES |  |
| [ ] | idcfopentradadevolucaoexterna | bigint | YES |  |
| [ ] | idcfopsaidadevolucaointerna | bigint | YES |  |
| [ ] | idcfopsaidadevolucaoexterna | bigint | YES |  |
| [ ] | idcfopentradatransfinterna | bigint | YES |  |
| [ ] | idcfopentradatransfexterna | bigint | YES |  |
| [ ] | idcfopsaidatransfinterna | bigint | YES |  |
| [ ] | idcfopsaidatransfexterna | bigint | YES |  |
| [ ] | tipofatorconversaounidadeetq | smallint | YES |  |
| [ ] | fatorconversaounidadeetq | numeric | YES |  |
| [ ] | idunidademedidaconversaoetq | bigint | YES |  |
| [ ] | percentualicmsstentrada | numeric | YES |  |
| [ ] | percentualfreteoutrasdespesas | numeric | YES |  |
| [ ] | idncm | bigint | YES |  |
| [ ] | percentualoutrosvalorescusto | numeric | YES |  |
| [ ] | outrosvalorescusto | numeric | YES |  |
| [ ] | valoripiultimanota | numeric | YES |  |
| [ ] | codigotipotributacaodia | character varying(4) | YES |  |
| [ ] | percentualipisaida | numeric | YES |  |
| [ ] | codigosprodutoacabado | text | YES |  |
| [ ] | indicecodigoprodutodia | smallint | YES |  |
| [ ] | valormultiplicadordia | numeric | YES |  |
| [ ] | possuilote | smallint | YES |  |
| [ ] | tipodatacontrolelote | smallint | YES |  |
| [ ] | prazovencimentolote | integer | YES |  |
| [ ] | codigocolecao | integer | YES |  |
| [ ] | percentualprecominimovenda | numeric | YES |  |
| [ ] | precominimovenda | numeric | YES |  |
| [ ] | informardimensao | smallint | YES |  |
| [ ] | numerofci | character varying(36) | YES |  |
| [ ] | freteconhecimento | numeric | YES |  |
| [ ] | baseicmsconhecimento | numeric | YES |  |
| [ ] | icmsconhecimento | numeric | YES |  |
| [ ] | basepiscofinsconhecimento | numeric | YES |  |
| [ ] | pisconhecimento | numeric | YES |  |
| [ ] | cofinsconhecimento | numeric | YES |  |
| [ ] | cnpjfilial | character varying(18) | YES |  |
| [ ] | percentuallucroajustado | numeric | YES |  |
| [ ] | tributacaosn | character varying(3) | YES |  |
| [ ] | enviafranqueado | smallint | YES |  |
| [ ] | comissaoquitacao | numeric | YES |  |
| [ ] | percentualmarkupajustado | numeric | YES |  |
| [ ] | situacaotributariasnentrada | character varying(3) | YES |  |
| [ ] | exigibilidadeiss | smallint | YES |  |
| [ ] | numeroprocessosuspensaoiss | character varying(30) | YES |  |
| [ ] | incentivofiscal | smallint | YES |  |
| [ ] | situacaotributariaentrada | character varying(3) | YES |  |
| [ ] | identificaconsumidor | smallint | YES |  |
| [ ] | origemcusto | smallint | YES |  |
| [ ] | custoalteradopor | text | YES |  |
| [ ] | idgradelinha | bigint | YES |  |
| [ ] | idgradecoluna | bigint | YES |  |
| [ ] | comissaopauta1 | numeric | YES |  |
| [ ] | comissaopauta2 | numeric | YES |  |
| [ ] | comissaopauta3 | numeric | YES |  |
| [ ] | comissaopauta4 | numeric | YES |  |
| [ ] | comissaoavistapauta1 | numeric | YES |  |
| [ ] | comissaoavistapauta2 | numeric | YES |  |
| [ ] | comissaoavistapauta3 | numeric | YES |  |
| [ ] | comissaoavistapauta4 | numeric | YES |  |
| [ ] | comissaoaprazopauta1 | numeric | YES |  |
| [ ] | comissaoaprazopauta2 | numeric | YES |  |
| [ ] | comissaoaprazopauta3 | numeric | YES |  |
| [ ] | comissaoaprazopauta4 | numeric | YES |  |
| [ ] | comissaoquitacaopauta1 | numeric | YES |  |
| [ ] | comissaoquitacaopauta2 | numeric | YES |  |
| [ ] | comissaoquitacaopauta3 | numeric | YES |  |
| [ ] | comissaoquitacaopauta4 | numeric | YES |  |
| [ ] | idleicomplementar | bigint | YES |  |
| [ ] | tipofichatecnicadesagregacao | character varying(1) | YES |  |
| [ ] | tipoprodutoreclassificacao | smallint | YES |  |
| [ ] | enviaecommerce | smallint | YES |  |
| [ ] | enviadelivery | smallint | YES |  |
| [ ] | icone | bytea | YES |  |
| [ ] | enviacomanda | smallint | YES |  |
| [ ] | idcreditoestimulado | bigint | YES |  |
| [ ] | idgrupounichef | bigint | YES |  |
| [ ] | idgradeunichef | bigint | YES |  |
| [ ] | codigoecommerce | character varying(50) | YES |  |
| [ ] | vendernounichef | smallint | YES |  |
| [ ] | idfamilia | bigint | YES |  |
| [ ] | opcional | smallint | YES |  |
| [ ] | leadtimecompra | integer | YES |  |
| [ ] | qtddiasestoqueseguro | integer | YES |  |
| [ ] | descricaoresumida | character varying(255) | YES |  |
| [ ] | idtabelaprecopainel | bigint | YES |  |
| [ ] | enviamobile | smallint | YES |  |
| [ ] | codigoregistro1400 | character varying(60) | YES |  |
| [ ] | contacontabilexterno | character varying(60) | YES |  |
| [ ] | cfopvendaecf | character varying(4) | YES |  |
| [ ] | qtddiascompra | integer | YES |  |
| [ ] | tributacaoespecialnfcesat | character varying(3) | YES |  |
| [ ] | aliquotareducaoicmsnfcesat | numeric | YES |  |
| [ ] | codigotipoimpressao | bigint | YES |  |
| [ ] | possuialiquotacombatepobreza | smallint | YES |  |
| [ ] | idenquadramentoipientrada | bigint | YES |  |
| [ ] | idenquadramentoipisaida | bigint | YES |  |
| [ ] | idcest | bigint | YES |  |
| [ ] | cest | character varying(10) | YES |  |
| [ ] | tipovolume | smallint | YES |  |
| [ ] | quantidadevolume | integer | YES |  |
| [ ] | idtabelafinanciamento | bigint | YES |  |
| [ ] | caminhoimagem | character varying(1024) | YES |  |
| [ ] | caminhoicone | character varying(1024) | YES |  |
| [ ] | vendaprogramada | smallint | YES |  |
| [ ] | vendaentregafutura | smallint | YES |  |
| [ ] | percentualreducaoicms | numeric | YES |  |
| [ ] | naocobrartaxaservico | smallint | YES |  |
| [ ] | porcaoopcional | numeric | YES |  |
| [ ] | extra7 | character varying(512) | YES |  |
| [ ] | extra8 | character varying(512) | YES |  |
| [ ] | extra9 | character varying(512) | YES |  |
| [ ] | extra10 | character varying(512) | YES |  |
| [ ] | extrabalanca6 | character varying(100) | YES |  |
| [ ] | extrabalanca7 | character varying(100) | YES |  |
| [ ] | extrabalanca8 | character varying(100) | YES |  |
| [ ] | extrabalanca9 | character varying(100) | YES |  |
| [ ] | extrabalanca10 | character varying(100) | YES |  |
| [ ] | extrabalanca11 | character varying(100) | YES |  |
| [ ] | extrabalanca12 | character varying(100) | YES |  |
| [ ] | mvaajustadoopinterestadual | smallint | YES |  |
| [ ] | codigoreceitasemcontribuicao | character varying(10) | YES |  |
| [ ] | idcomprador | bigint | YES |  |
| [ ] | podeserflex | smallint | YES |  |
| [ ] | porcentagemmaxflex | numeric | YES |  |
| [ ] | porcentagemminflex | numeric | YES |  |
| [ ] | valoricmsdiferencialentrada | numeric | YES |  |
| [ ] | aliquotaicmsdiferencialentrada | numeric | YES |  |
| [ ] | valorvendor | numeric | YES |  |
| [ ] | valorlancamentospedcusto | numeric | YES |  |
| [ ] | diferidoicmsentrada | numeric | YES |  |
| [ ] | codigofichatecnica | character varying(40) | YES |  |
| [ ] | pesoespecifico | numeric | YES |  |
| [ ] | relacaomistura | character varying(40) | YES |  |
| [ ] | percredbasepiscofinssaida | numeric | YES |  |
| [ ] | percredbasepiscofinsentrada | numeric | YES |  |
| [ ] | idcfopcontroleperda | bigint | YES |  |
| [ ] | basepiscofinsentradapreco | numeric | YES |  |
| [ ] | naoregistrarproducaovenda | smallint | YES |  |
| [ ] | extra11 | character varying(512) | YES |  |
| [ ] | extra12 | character varying(512) | YES |  |
| [ ] | extra13 | character varying(512) | YES |  |
| [ ] | extra14 | character varying(512) | YES |  |
| [ ] | extra15 | character varying(512) | YES |  |
| [ ] | extra16 | character varying(512) | YES |  |
| [ ] | idcfopsaidanfce | bigint | YES |  |
| [ ] | informacoesgourmet | character varying(4096) | YES |  |
| [ ] | impressoemticket | smallint | YES |  |
| [ ] | eantributavel | character varying(20) | YES |  |
| [ ] | fcpstentrada | numeric | YES |  |
| [ ] | aliquotafcp | numeric | YES |  |
| [ ] | ultimabasefcpst | numeric | YES |  |
| [ ] | ultimovalorfcpst | numeric | YES |  |
| [ ] | descricaoanp | character varying(95) | YES |  |
| [ ] | percentualfcpstentrada | numeric | YES |  |
| [ ] | porcmaxgerarflex | numeric | YES |  |
| [ ] | escalarelevante | character varying(1) | YES |  |
| [ ] | cnpjfabricante | character varying(18) | YES |  |
| [ ] | codigobeneficiofiscaluf | character varying(10) | YES |  |
| [ ] | rastreabilidade | smallint | YES |  |
| [ ] | produtonovo | smallint | YES |  |
| [ ] | conferirpeso | smallint | YES |  |
| [ ] | quantidaderepresentativa | numeric | YES |  |
| [ ] | idunidademedidareferencial | bigint | YES |  |
| [ ] | percentualglppetroleo | numeric | YES |  |
| [ ] | percentualglpgasnacional | numeric | YES |  |
| [ ] | percentualglpgasimportado | numeric | YES |  |
| [ ] | valorpartida | numeric | YES |  |
| [ ] | idcfopsaidaexternanaocontrib | bigint | YES |  |
| [ ] | rebaixa | numeric | YES |  |
| [ ] | saldoestoquerebaixa | numeric | YES |  |
| [ ] | valortotalrebaixa | numeric | YES |  |
| [ ] | observacaorebaixa | text | YES |  |
| [ ] | lucrobrutominimo | numeric | YES |  |
| [ ] | lucrobrutomaximo | numeric | YES |  |
| [ ] | percentualmarkupminimo | numeric | YES |  |
| [ ] | percentualmarkupmaximo | numeric | YES |  |
| [ ] | codigotributacaomunicipio | character varying(20) | YES |  |
| [ ] | registraproducaosubitens | smallint | YES |  |
| [ ] | ultimaaliquotaicmsst | numeric | YES |  |
| [ ] | ultimaaliquotafcpst | numeric | YES |  |
| [ ] | codigoanvisa | character varying(13) | YES |  |
| [ ] | precomaximoconsumidor | numeric | YES |  |
| [ ] | codigoprodutogestor | character varying(20) | YES |  |
| [ ] | idvalornutricional | bigint | YES |  |
| [ ] | iddepartamento | bigint | YES |  |
| [ ] | ultimovaloricmssubstituto | numeric | YES |  |
| [ ] | baseipiultimanota | numeric | YES |  |
| [ ] | idbeneficiofiscaloperacao | bigint | YES |  |
| [ ] | idbeneficiofiscalnf | bigint | YES |  |
| [ ] | motivodesoneracaoicms | smallint | YES |  |
| [ ] | motivodesoneracaonf | smallint | YES |  |
| [ ] | aliquotaicmsnf | numeric | YES |  |
| [ ] | aliquotafcpnf | numeric | YES |  |
| [ ] | percentualfcpentrada | numeric | YES |  |
| [ ] | enviaifood | smallint | YES |  |
| [ ] | enviarmercadolivre | smallint | YES |  |
| [ ] | idcategoriamercadolivre | bigint | YES |  |
| [ ] | idtipoanunciomercadolivre | bigint | YES |  |
| [ ] | modoshippingmercadolivre | smallint | YES |  |
| [ ] | fretegratismercadolivre | smallint | YES |  |
| [ ] | retiradalocalmercadolivre | smallint | YES |  |
| [ ] | produtonovomercadolivre | smallint | YES |  |
| [ ] | tipogarantiamercadolivre | integer | YES |  |
| [ ] | tempogarantiamercadolivre | smallint | YES |  |
| [ ] | valortempogarantiamercadolivre | numeric | YES |  |
| [ ] | tipovendamercadolivre | smallint | YES |  |
| [ ] | descricaomercadolivre | text | YES |  |
| [ ] | tipoquantidadeproducao | smallint | YES |  |
| [ ] | produzirapenassemsaldo | smallint | YES |  |
| [ ] | descricaoshop | text | YES |  |
| [ ] | infoshop | text | YES |  |
| [ ] | pesoshop | numeric | YES |  |
| [ ] | alturashop | numeric | YES |  |
| [ ] | largurashop | numeric | YES |  |
| [ ] | comprimentoshop | numeric | YES |  |
| [ ] | tipoembalagemshop | smallint | YES |  |
| [ ] | dataultimacomposicaopreco | date | YES |  |
| [ ] | custoaquisicao | numeric | YES |  |
| [ ] | pontoequilibrio | numeric | YES |  |
| [ ] | idmotivorebaixa | bigint | YES |  |
| [ ] | marcaveiculo | character varying(20) | YES |  |
| [ ] | idgruposhop | bigint | YES |  |
| [ ] | precooriginal | numeric | YES |  |
| [ ] | hashpafnfce | bigint | YES |  |
| [ ] | enviarmagento | smallint | YES |  |
| [ ] | valorlancamentospedcustodebito | numeric | YES |  |
| [ ] | tipogeracaoproducao | smallint | YES |  |
| [ ] | cmvatual | numeric | YES |  |
| [ ] | enviarwoocommerce | smallint | YES |  |
| [ ] | produtovirtual | smallint | YES |  |
| [ ] | enviartray | smallint | YES |  |
| [ ] | enviarhub2b | smallint | YES |  |
| [ ] | datacalculocustomedio | date | YES |  |
| [ ] | customediopendente | smallint | YES |  |
| [ ] | precificacaokitpendente | smallint | YES |  |
| [ ] | enviarnuvemshop | smallint | YES |  |
| [ ] | descricaocolunagrade | character varying(255) | YES |  |
| [ ] | descricaolinhagrade | character varying(255) | YES |  |
| [ ] | precodiferenciado | smallint | YES |  |
| [ ] | custovariavelgestaopreco | numeric | YES |  |
| [ ] | outrasdespesasgestaopreco | numeric | YES |  |
| [ ] | outrosimpostosgestaopreco | numeric | YES |  |
| [ ] | comissaogestaopreco | numeric | YES |  |
| [ ] | idultimoprecoprodutoaplicado | bigint | YES |  |
| [ ] | idultimoprecopauta1aplicado | bigint | YES |  |
| [ ] | idultimoprecopauta2aplicado | bigint | YES |  |
| [ ] | idultimoprecopauta3aplicado | bigint | YES |  |
| [ ] | idultimoprecopauta4aplicado | bigint | YES |  |
| [ ] | datainativacaoscanntech | bigint | YES |  |
| [ ] | diferencialicmsgestaocusto | numeric | YES |  |
| [ ] | outrosvalorescredgestaocusto | numeric | YES |  |
| [ ] | outrosvaloresdebgestaocusto | numeric | YES |  |
| [ ] | enviaroutrosecommerce | smallint | YES |  |
| [ ] | enviarcestoperacaosemst | smallint | YES |  |
| [ ] | enviarmercos | smallint | YES |  |
| [ ] | motivoisencaocodigoanvisa | character varying(255) | YES |  |
| [ ] | enviarmagazord | smallint | YES |  |
| [ ] | enviarfeed | smallint | YES |  |
| [ ] | idgrupogoogle | bigint | YES |  |
| [ ] | tipocomponentedescricao | character varying(10) | YES |  |
| [ ] | tipocomponenteadicional | character varying(10) | YES |  |
| [ ] | percentualmarkdownminimo | numeric | YES |  |
| [ ] | percentualmarkdownmaximo | numeric | YES |  |
| [ ] | idmarca | bigint | YES |  |
| [ ] | feedgoogle | json | YES |  |
| [ ] | prefixolicenca | character varying(50) | YES |  |
| [ ] | mensalidadelicenca | numeric | YES |  |
| [ ] | licencaincremento | smallint | YES | 0 |
| [ ] | informacaoinstalacao | smallint | YES |  |
| [ ] | ignorarclassificacaocliente | smallint | YES | 0 |
| [ ] | vendernoportal | smallint | YES | 0 |
| [ ] | ignorarestoque | smallint | YES | 0 |
| [ ] | prefixolicencavalidacaocnpj | character varying(50) | YES |  |
| [ ] | codigolicencafaturamento | character varying(20) | YES |  |
| [ ] | permitedegustarlicenca | smallint | YES | 0 |
| [ ] | tipousolicenca | smallint | YES |  |
| [ ] | idhierarquiagruposervico | bigint | YES |  |
| [ ] | enviarclimba | smallint | YES |  |
| [ ] | precosobconsultaecommerce | smallint | YES |  |
| [ ] | alertarestoqueforalimite | smallint | YES | 0 |
| [ ] | alertarestoquezero | smallint | YES | 0 |
| [ ] | alertarestoquenegativo | smallint | YES | 0 |
| [ ] | videoidyoutube | character varying(120) | YES |  |
| [ ] | nomeecommerce | character varying(120) | YES |  |
| [ ] | idrepositor | bigint | YES |  |
| [ ] | tipolicenca | smallint | YES |  |
| [ ] | tiposistemalicenca | smallint | YES |  |
| [ ] | tipolicenciamento | smallint | YES |  |
| [ ] | tipocombolicenca | smallint | YES |  |
| [ ] | permitedemonstracao | smallint | YES | 0 |
| [ ] | enviarconectavenda | smallint | YES |  |
| [ ] | dataatualizacaointegfiscal | date | YES |  |
| [ ] | idcategoriaconsultapdv | bigint | YES |  |
| [ ] | multiplicavel | smallint | YES | 0 |
| [ ] | exibirmenucompras | smallint | YES | 0 |
| [ ] | idvasilhame | bigint | YES |  |
| [ ] | possuisistematicaatacadistape | smallint | YES |  |
| [ ] | compraporcotacao | smallint | YES |  |
| [ ] | sazonal | smallint | YES |  |
| [ ] | diasparanotificarposvenda | integer | YES |  |
| [ ] | precocustobasedesagregacao | numeric | YES |  |
| [ ] | urlvideo | character varying(255) | YES |  |
| [ ] | tributacaoissnacional | character varying(1) | YES |  |
| [ ] | numerobeneficioissnacional | character varying(14) | YES |  |
| [ ] | percentualreducaoissnacional | numeric | YES |  |
| [ ] | tiposuspensaoissnacional | character varying(1) | YES |  |
| [ ] | tipoimunidadeissnacional | character varying(1) | YES |  |
| [ ] | aliquotaissnacional | numeric | YES |  |
| [ ] | tiporetencaoissnacional | character varying(1) | YES |  |
| [ ] | numeroprocessoissnacional | character varying(30) | YES |  |
| [ ] | idtributacaonacionaliss | bigint | YES |  |
| [ ] | enviaabrahao | smallint | YES |  |
| [ ] | produtopizza | smallint | YES |  |
| [ ] | percentualprecoecommerce | numeric | YES |  |
| [ ] | idgrupoentrega | bigint | YES |  |
| [ ] | pontosfidelidadeporunidade | smallint | YES |  |
| [ ] | percentualpauta1 | numeric | YES |  |
| [ ] | percentualpauta2 | numeric | YES |  |
| [ ] | percentualpauta3 | numeric | YES |  |
| [ ] | percentualpauta4 | numeric | YES |  |
| [ ] | tipointegracaofiscal | smallint | YES |  |
| [ ] | perctoleranciaconferencia | numeric | YES |  |
| [ ] | idtara | bigint | YES |  |
| [ ] | sugeriritensadicionais | smallint | YES |  |
| [ ] | tiporodizio | smallint | YES |  |
| [ ] | percentualbiodiesel | numeric | YES |  |
| [ ] | precofixoecommerce | numeric | YES |  |
| [ ] | solicitaidentificadorlicenca | smallint | YES | 0 |
| [ ] | idbeneficiofiscalnfred51 | bigint | YES |  |
| [ ] | observacaonotafiscal | text | YES |  |
| [ ] | possuiincentivofiscalpdv | smallint | YES |  |
| [ ] | metodolote | smallint | YES |  |
| [ ] | sequencialote | bigint | YES | 0 |
| [ ] | idbeneficiofiscalpresu | bigint | YES |  |
| [ ] | aliquotaicmspresu | numeric | YES |  |
| [ ] | idbeneficiofiscalnfpresu | bigint | YES |  |
| [ ] | aliquotaicmsnfpresu | numeric | YES |  |
| [ ] | kitinteligente | smallint | YES |  |
| [ ] | sequencianumeroserie | bigint | YES | 0 |
| [ ] | informacaoadicionalproducao | text | YES |  |
| [ ] | codigodisponibilidade | bigint | YES |  |
| [ ] | identificadortefvalegas | text | YES |  |
| [ ] | nomeprodutobalanca | character varying(120) | YES |  |
| [ ] | aliquotapisredbeneficio | numeric | YES |  |
| [ ] | aliquotacofinsredbeneficio | numeric | YES |  |

# Colunas de "produtoean" (11 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('produtoean_id_seq'::regclass) |
| [ ] | idproduto | bigint | YES | 0 |
| [ ] | ean | character varying(20) | YES | ''::character varying |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | variacao | smallint | YES |  |
| [ ] | descricaovariacao | character varying(255) | YES |  |
| [ ] | idusuarioinativo | bigint | YES |  |
| [ ] | dataultimoinativo | timestamp without time zone | YES |  |
| [ ] | idusuarioativo | bigint | YES |  |
| [ ] | dataultimoativo | timestamp without time zone | YES |  |
| [ ] | inativo | smallint | YES |  |

# Colunas de "saldoestoque" (15 encontradas)

| Usar? | Coluna | Tipo | Nulo? | Default |
| --- | --- | --- | --- | --- |
| [ ] | id | bigint | NO | nextval('saldoestoque_id_seq'::regclass) |
| [ ] | idfilial | bigint | NO |  |
| [ ] | idproduto | bigint | YES |  |
| [ ] | variacao | integer | NO |  |
| [ ] | quantidade | numeric | YES |  |
| [ ] | hash | bigint | YES |  |
| [ ] | ultimaalteracao | date | YES |  |
| [ ] | codigoproduto | character varying(20) | YES |  |
| [ ] | nomeproduto | character varying(120) | YES |  |
| [ ] | produto | character varying(20) | YES |  |
| [ ] | currenttimemillis | bigint | YES |  |
| [ ] | unidademedida | character varying(6) | YES |  |
| [ ] | cnpjfilial | character varying(18) | YES |  |
| [ ] | cest | character varying(10) | YES |  |
| [ ] | ncm | character varying(10) | YES |  |

