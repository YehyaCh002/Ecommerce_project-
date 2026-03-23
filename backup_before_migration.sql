--
-- PostgreSQL database dump
--

\restrict UaUPVLTau2NxZH0ccZAoUv4A78q5XD1I34HlPbJPsRK43D4UGx9rhMYxJs4LaGi

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: order_history_action_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_history_action_enum AS ENUM (
    'Créé',
    'Statut Mis à Jour',
    'Imprimé',
    'En Préparation',
    'Expédié',
    'Vers Wilaya',
    'Reçu à Wilaya',
    'Message Envoyé',
    'Transfert',
    'Annulé',
    'Livraison Assignée',
    'Échange'
);


ALTER TYPE public.order_history_action_enum OWNER TO postgres;

--
-- Name: order_history_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_history_status_enum AS ENUM (
    'En attente',
    'Non répondu - 1ère tentative',
    'Confirmé',
    'OTP Confirmé',
    'Vers la Wilaya',
    'Reçu à la Wilaya',
    'Livré',
    'Annulé',
    'Commande Fictive'
);


ALTER TYPE public.order_history_status_enum OWNER TO postgres;

--
-- Name: orders_deliverytype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.orders_deliverytype_enum AS ENUM (
    'Domicile',
    'Bureau',
    'Yalidine Desk',
    'Stop Desk'
);


ALTER TYPE public.orders_deliverytype_enum OWNER TO postgres;

--
-- Name: orders_source_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.orders_source_enum AS ENUM (
    'Facebook',
    'Instagram',
    'TikTok',
    'Website',
    'Phone',
    'Other'
);


ALTER TYPE public.orders_source_enum OWNER TO postgres;

--
-- Name: orders_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.orders_status_enum AS ENUM (
    'En attente',
    'Non répondu - 1ère tentative',
    'Confirmé',
    'OTP Confirmé',
    'Vers la Wilaya',
    'Reçu à la Wilaya',
    'Livré',
    'Annulé',
    'Commande Fictive'
);


ALTER TYPE public.orders_status_enum OWNER TO postgres;

--
-- Name: orders_validationoutcome_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.orders_validationoutcome_enum AS ENUM (
    'received',
    'returned',
    'exchanged',
    'refused',
    'unreachable',
    'other'
);


ALTER TYPE public.orders_validationoutcome_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "cartId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "variantId" uuid
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    slug character varying(255),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    "phoneNumber" character varying(50) NOT NULL,
    email character varying(255),
    "defaultAddress" character varying(500),
    "totalOrdersCount" integer DEFAULT 0 NOT NULL,
    "isBlacklisted" boolean DEFAULT false NOT NULL,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: delivery_platforms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_platforms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    "apiKey" character varying(255),
    "apiSecret" character varying(255),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.delivery_platforms OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: order_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_history (
    id integer NOT NULL,
    "orderId" integer NOT NULL,
    "changedByUserId" uuid,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    details text,
    action public.order_history_action_enum DEFAULT 'Créé'::public.order_history_action_enum NOT NULL,
    status public.order_history_status_enum
);


ALTER TABLE public.order_history OWNER TO postgres;

--
-- Name: order_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.order_history_id_seq OWNER TO postgres;

--
-- Name: order_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_history_id_seq OWNED BY public.order_history.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "productId" uuid NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "orderId" integer NOT NULL,
    "variantId" uuid
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    "userId" uuid,
    "totalPrice" numeric(10,2) NOT NULL,
    "shippingAddress" character varying(500),
    "paymentMethod" character varying(255),
    remark text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "customerName" character varying(255) NOT NULL,
    "phoneNumber" character varying(50) NOT NULL,
    rating integer,
    source public.orders_source_enum DEFAULT 'Other'::public.orders_source_enum NOT NULL,
    "trackingNumber" character varying(100),
    "isDelayed" boolean DEFAULT false NOT NULL,
    "wilayaId" integer,
    "assignedToId" uuid,
    id integer NOT NULL,
    status public.orders_status_enum DEFAULT 'En attente'::public.orders_status_enum NOT NULL,
    "customerId" uuid,
    "deliveryPlatformId" uuid,
    "internalComment" text,
    "shippingFee" numeric(10,2) DEFAULT 0 NOT NULL,
    "isExchange" boolean DEFAULT false NOT NULL,
    "exchangePrice" numeric(10,2) DEFAULT 0 NOT NULL,
    "productToCollect" text,
    "isFreeShipping" boolean DEFAULT false NOT NULL,
    "hasInsurance" boolean DEFAULT false NOT NULL,
    "customerEmail" character varying(255),
    "detailedAddress" text,
    "soldFromStore" boolean DEFAULT false NOT NULL,
    "isValidated" boolean DEFAULT false NOT NULL,
    "deliveryType" public.orders_deliverytype_enum DEFAULT 'Domicile'::public.orders_deliverytype_enum,
    "validationOutcome" public.orders_validationoutcome_enum,
    "validatedAt" timestamp without time zone
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "productId" uuid NOT NULL,
    size character varying(50),
    color character varying(50),
    stock integer DEFAULT 0 NOT NULL,
    "priceOverride" numeric(10,2),
    sku character varying(255),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "imageUrl" character varying(255),
    sku character varying(255),
    "isActive" boolean DEFAULT true NOT NULL,
    "categoryId" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'customer'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    avatar character varying(500)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: wilayas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wilayas (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    "shippingFee" numeric(10,2),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wilayas OWNER TO postgres;

--
-- Name: wilayas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wilayas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wilayas_id_seq OWNER TO postgres;

--
-- Name: wilayas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wilayas_id_seq OWNED BY public.wilayas.id;


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: order_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_history ALTER COLUMN id SET DEFAULT nextval('public.order_history_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: wilayas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wilayas ALTER COLUMN id SET DEFAULT nextval('public.wilayas_id_seq'::regclass);


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, "cartId", "productId", quantity, "createdAt", "updatedAt", "variantId") FROM stdin;
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carts (id, "userId", "isActive", "createdAt", "updatedAt") FROM stdin;
25a4e95c-3ee4-42e3-8257-0fb5c5b6fc53	ec67b37b-7096-4b6b-99ba-9e9604a2de0d	t	2026-02-01 10:36:02.399546	2026-02-01 10:36:02.399546
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, description, slug, "createdAt", "updatedAt") FROM stdin;
3a8312de-bb94-4e68-a135-0ba7489c07e9	Electronics	Electronic devices and gadgets	electronics	2026-02-01 10:35:28.470102	2026-02-01 10:35:28.470102
a615d5d7-1ae5-4169-987d-2e34a0b35bbe	Clothing	Fashion and apparel	clothing	2026-02-01 10:35:28.541695	2026-02-01 10:35:28.541695
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, name, "phoneNumber", email, "defaultAddress", "totalOrdersCount", "isBlacklisted", notes, "createdAt", "updatedAt") FROM stdin;
025eedbc-fc01-4f6e-b6b6-f95edc19d424	Verification User	0123456789	\N	\N	1	f	\N	2026-03-22 13:21:00.8279	2026-03-22 13:22:15.28185
7c9f29fe-00c1-41fc-8895-b0ae3f3e6868	Greedy Buyer	0666666666	\N	\N	0	f	\N	2026-03-22 13:26:22.087087	2026-03-22 13:26:22.087087
deb649ad-5a6e-4dd6-bed0-530012b3b484	Playwright API User	0999888777	\N	\N	2	f	\N	2026-03-22 13:26:21.879634	2026-03-22 13:26:42.740595
\.


--
-- Data for Name: delivery_platforms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.delivery_platforms (id, name, "apiKey", "apiSecret", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1769770380747	CreateUserTable1769770380747
2	1769770380748	CreateEcommerceTables1769770380748
3	1771506122903	UpdateOrderEntityAndAddWilayaAndHistory1771506122903
4	1771506122904	FixDatabaseIntegrityIssues1771506122904
5	1773331122900	RefactorOrderHistory1773331122900
6	1774049747084	AddCustomerTable1774049747084
7	1774050242936	AddDeliveryPlatformAndTimer1774050242936
8	1775132845359	ManualUpdateOrderExchangeAndShipping1775132845359
9	1775138123456	AddEmailAndDetailedAddressToOrder1775138123456
10	1775139000000	AddDeliveryTypeAndStoreFlag1775139000000
11	1775140000000	AddProductVariants1775140000000
12	1774194871221	AddIsValidatedToOrder1774194871221
13	1776001000000	AddOrderValidationOutcome1776001000000
\.


--
-- Data for Name: order_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_history (id, "orderId", "changedByUserId", "timestamp", details, action, status) FROM stdin;
1	2	\N	2026-03-22 13:22:15.299502	Order was placed from landing page.	Créé	\N
2	3	\N	2026-03-22 13:26:21.934923	Order was placed from landing page.	Créé	\N
3	4	\N	2026-03-22 13:26:42.750128	Order was placed from landing page.	Créé	\N
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, "productId", quantity, price, "createdAt", "orderId", "variantId") FROM stdin;
901254d7-1662-48ce-8580-d8a808780cd3	c4a794d6-ed76-4610-9ad4-5d4314f72333	1	1299.99	2026-02-01 10:36:02.530671	1	\N
038d3139-6b42-41c2-905b-b56a0ee12909	51c2197a-737d-45e7-9a99-2626ea34c166	2	29.99	2026-02-01 10:36:02.555626	1	\N
6de4453b-2a42-4b75-b8c0-940f84290b0f	19a5aa0c-7725-417e-9c8e-a2d5c5f05d6e	2	2500.00	2026-03-22 13:22:15.315888	2	8a6dd726-a8e9-4273-b918-ea03a39582f9
964dcc77-f95a-4fb4-9d64-0459ad1ccee9	19a5aa0c-7725-417e-9c8e-a2d5c5f05d6e	1	2500.00	2026-03-22 13:26:21.944884	3	8a6dd726-a8e9-4273-b918-ea03a39582f9
84e70531-9d13-4f2b-b8a7-64110cf22263	19a5aa0c-7725-417e-9c8e-a2d5c5f05d6e	1	2500.00	2026-03-22 13:26:42.759933	4	8a6dd726-a8e9-4273-b918-ea03a39582f9
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders ("userId", "totalPrice", "shippingAddress", "paymentMethod", remark, "createdAt", "updatedAt", "customerName", "phoneNumber", rating, source, "trackingNumber", "isDelayed", "wilayaId", "assignedToId", id, status, "customerId", "deliveryPlatformId", "internalComment", "shippingFee", "isExchange", "exchangePrice", "productToCollect", "isFreeShipping", "hasInsurance", "customerEmail", "detailedAddress", "soldFromStore", "isValidated", "deliveryType", "validationOutcome", "validatedAt") FROM stdin;
ec67b37b-7096-4b6b-99ba-9e9604a2de0d	1359.97	123 Main Street, New York, NY 10001	Credit Card	Please deliver before noon	2026-02-01 10:36:02.521632	2026-02-01 10:36:02.605676	Test Customer	0000000000	\N	Other	\N	f	\N	\N	1	En attente	\N	\N	\N	0.00	f	0.00	\N	f	f	\N	\N	f	f	Domicile	\N	\N
\N	5000.00	\N	CASH	\N	2026-03-22 13:22:15.255971	2026-03-22 13:22:15.255971	Verification User	0123456789	\N	Website	\N	f	\N	\N	2	En attente	025eedbc-fc01-4f6e-b6b6-f95edc19d424	\N	\N	0.00	f	0.00	\N	f	f	\N	\N	f	f	Domicile	\N	\N
\N	2500.00	\N	CASH	\N	2026-03-22 13:26:21.910246	2026-03-22 13:26:21.910246	Playwright API User	0999888777	\N	Website	\N	f	\N	\N	3	En attente	deb649ad-5a6e-4dd6-bed0-530012b3b484	\N	\N	0.00	f	0.00	\N	f	f	\N	\N	f	f	Domicile	\N	\N
\N	2500.00	\N	CASH	\N	2026-03-22 13:26:42.714407	2026-03-22 13:26:42.714407	Playwright API User	0999888777	\N	Website	\N	f	\N	\N	4	En attente	deb649ad-5a6e-4dd6-bed0-530012b3b484	\N	\N	0.00	f	0.00	\N	f	f	\N	\N	f	f	Domicile	\N	\N
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variants (id, "productId", size, color, stock, "priceOverride", sku, "createdAt", "updatedAt") FROM stdin;
cde38e7c-f841-4433-9057-78e0530a8da4	19a5aa0c-7725-417e-9c8e-a2d5c5f05d6e	M	Vert	9	\N	\N	2026-03-22 13:15:57.321835	2026-03-22 13:15:57.321835
d7e02e41-eb5a-4564-a3bd-1bb566f4b53b	19a5aa0c-7725-417e-9c8e-a2d5c5f05d6e	L	Vert	9	\N	\N	2026-03-22 13:15:57.341654	2026-03-22 13:15:57.341654
e2a0e733-9c92-4047-a9fc-cd7d879707f4	19a5aa0c-7725-417e-9c8e-a2d5c5f05d6e	XL	Vert	8	\N	\N	2026-03-22 13:15:57.360471	2026-03-22 13:15:57.360471
8a6dd726-a8e9-4273-b918-ea03a39582f9	19a5aa0c-7725-417e-9c8e-a2d5c5f05d6e	S	Vert	4	\N	\N	2026-03-22 13:15:57.298017	2026-03-22 13:26:42.779171
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, price, stock, "imageUrl", sku, "isActive", "categoryId", "createdAt", "updatedAt") FROM stdin;
747873fe-337f-40e2-a0e7-fdb1a9440b0f	Laptop Pro 15	High-performance laptop with 16GB RAM	1299.99	50	\N	LAP-001	t	3a8312de-bb94-4e68-a135-0ba7489c07e9	2026-02-01 10:35:28.554842	2026-02-01 10:35:28.554842
6f390206-119f-4b54-b34f-4f1eb46f4bd1	Wireless Mouse	Ergonomic wireless mouse	29.99	200	\N	MOUSE-001	t	3a8312de-bb94-4e68-a135-0ba7489c07e9	2026-02-01 10:35:28.577228	2026-02-01 10:35:28.577228
124791af-ff63-41fb-b8b5-f379f5cfd839	Cotton T-Shirt	Comfortable cotton t-shirt	19.99	100	\N	SHIRT-001	t	a615d5d7-1ae5-4169-987d-2e34a0b35bbe	2026-02-01 10:35:28.592047	2026-02-01 10:35:28.592047
27ebbdf9-e9a6-461b-99c2-a5e74492fda4	Cotton T-Shirt	Comfortable cotton t-shirt	19.99	100	\N	SHIRT-001	t	\N	2026-02-01 10:36:02.368173	2026-02-01 10:36:02.368173
c4a794d6-ed76-4610-9ad4-5d4314f72333	Laptop Pro 15	High-performance laptop with 16GB RAM	1299.99	49	\N	LAP-001	t	\N	2026-02-01 10:36:02.347255	2026-02-01 10:36:02.546015
51c2197a-737d-45e7-9a99-2626ea34c166	Wireless Mouse	Ergonomic wireless mouse	29.99	198	\N	MOUSE-001	t	\N	2026-02-01 10:36:02.358376	2026-02-01 10:36:02.56456
19a5aa0c-7725-417e-9c8e-a2d5c5f05d6e	T-Shirt Oversize	Premium cotton oversize t-shirt	2500.00	34	\N	TSH-OVR-001	t	a615d5d7-1ae5-4169-987d-2e34a0b35bbe	2026-03-22 13:15:57.23363	2026-03-22 13:15:57.23363
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, role, "createdAt", "updatedAt", avatar) FROM stdin;
ba05b5e6-1cca-470c-a9bf-cfd6ebf13306	Yehia	yahia@gmail.com	1234456	cutomer	2026-01-31 10:55:20.516842	2026-01-31 11:00:06.82274	\N
ec67b37b-7096-4b6b-99ba-9e9604a2de0d	Test Customer	customer@test.com	password123	customer	2026-02-01 10:36:02.212345	2026-02-01 10:36:02.212345	\N
\.


--
-- Data for Name: wilayas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wilayas (id, name, code, "shippingFee", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 13, true);


--
-- Name: order_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_history_id_seq', 3, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 4, true);


--
-- Name: wilayas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wilayas_id_seq', 1, false);


--
-- Name: customers PK_133ec679a801fab5e070f73d3ea; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);


--
-- Name: product_variants PK_281e3f2c55652d6a22c0aa59fd7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY (id);


--
-- Name: delivery_platforms PK_3fabf5af0acca4313978d0f7916; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_platforms
    ADD CONSTRAINT "PK_3fabf5af0acca4313978d0f7916" PRIMARY KEY (id);


--
-- Name: orders PK_710e2d4957aa5878dfe94e4ac2f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: order_history PK_cc71513680d03ecb01b96655b0c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_history
    ADD CONSTRAINT "PK_cc71513680d03ecb01b96655b0c" PRIMARY KEY (id);


--
-- Name: wilayas PK_fee33960793c27e45b3162eb0d3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wilayas
    ADD CONSTRAINT "PK_fee33960793c27e45b3162eb0d3" PRIMARY KEY (id);


--
-- Name: delivery_platforms UQ_039c70e736c21d586272bd50a96; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_platforms
    ADD CONSTRAINT "UQ_039c70e736c21d586272bd50a96" UNIQUE (name);


--
-- Name: wilayas UQ_32052c4ea95aa7ae74b41a761f6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wilayas
    ADD CONSTRAINT "UQ_32052c4ea95aa7ae74b41a761f6" UNIQUE (code);


--
-- Name: customers UQ_3e418bff40d3abac5642cd5d398; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "UQ_3e418bff40d3abac5642cd5d398" UNIQUE ("phoneNumber");


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: wilayas UQ_fe03871dc5b980347e04e06fc3d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wilayas
    ADD CONSTRAINT "UQ_fe03871dc5b980347e04e06fc3d" UNIQUE (name);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: order_history FK_0af6da01c049f96d7954888e85a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_history
    ADD CONSTRAINT "FK_0af6da01c049f96d7954888e85a" FOREIGN KEY ("changedByUserId") REFERENCES public.users(id);


--
-- Name: orders FK_23fdf30c3994ef48cabdf748d0f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_23fdf30c3994ef48cabdf748d0f" FOREIGN KEY ("deliveryPlatformId") REFERENCES public.delivery_platforms(id);


--
-- Name: orders FK_4be52755ec6531d3533238bc2de; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_4be52755ec6531d3533238bc2de" FOREIGN KEY ("wilayaId") REFERENCES public.wilayas(id);


--
-- Name: order_items FK_516736b9807228bb17b2d0a3e2a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_516736b9807228bb17b2d0a3e2a" FOREIGN KEY ("variantId") REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: orders FK_58196933a1c73fc71d2149d39b6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_58196933a1c73fc71d2149d39b6" FOREIGN KEY ("assignedToId") REFERENCES public.users(id);


--
-- Name: cart_items FK_5a27845bc2d79be6f1fa3d2c036; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "FK_5a27845bc2d79be6f1fa3d2c036" FOREIGN KEY ("variantId") REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: carts FK_69828a178f152f157dcf2f70a89; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT "FK_69828a178f152f157dcf2f70a89" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cart_items FK_72679d98b31c737937b8932ebe6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "FK_72679d98b31c737937b8932ebe6" FOREIGN KEY ("productId") REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: order_items FK_cdb99c05982d5191ac8465ac010; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_history FK_e15b4a73a3e53311433968993cc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_history
    ADD CONSTRAINT "FK_e15b4a73a3e53311433968993cc" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders FK_e5de51ca888d8b1f5ac25799dd1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES public.customers(id);


--
-- Name: cart_items FK_edd714311619a5ad09525045838; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT "FK_edd714311619a5ad09525045838" FOREIGN KEY ("cartId") REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: order_items FK_f1d359a55923bb45b057fbdab0d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_variants FK_f515690c571a03400a9876600b5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT "FK_f515690c571a03400a9876600b5" FOREIGN KEY ("productId") REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products FK_ff56834e735fa78a15d0cf21926; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict UaUPVLTau2NxZH0ccZAoUv4A78q5XD1I34HlPbJPsRK43D4UGx9rhMYxJs4LaGi

