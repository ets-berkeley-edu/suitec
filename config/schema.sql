--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.4
-- Dumped by pg_dump version 9.6.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;
SET search_path = public, pg_catalog;

--
-- Name: enum_activities_object_type; Type: TYPE; Schema: public; Owner: suitec
--

CREATE TYPE enum_activities_object_type AS ENUM (
    'asset',
    'canvas_discussion',
    'canvas_submission',
    'chat',
    'comment',
    'pin',
    'whiteboard'
);


ALTER TYPE enum_activities_object_type OWNER TO suitec;

--
-- Name: enum_activities_type; Type: TYPE; Schema: public; Owner: suitec
--

CREATE TYPE enum_activities_type AS ENUM (
    'add_asset',
    'like',
    'dislike',
    'get_view_asset',
    'get_like',
    'get_dislike',
    'asset_comment',
    'get_asset_comment',
    'comment',
    'get_comment',
    'get_asset_comment_reply',
    'pin_asset',
    'repin_asset',
    'get_pin_asset',
    'get_repin_asset',
    'submit_assignment',
    'discussion_topic',
    'discussion_entry',
    'get_discussion_entry_reply',
    'export_whiteboard',
    'view_asset',
    'whiteboard_add_asset',
    'get_whiteboard_add_asset',
    'whiteboard_chat',
    'remix_whiteboard',
    'get_remix_whiteboard'
);


ALTER TYPE enum_activities_type OWNER TO suitec;

--
-- Name: enum_activity_types_type; Type: TYPE; Schema: public; Owner: suitec
--

CREATE TYPE enum_activity_types_type AS ENUM (
    'add_asset',
    'like',
    'dislike',
    'get_like',
    'get_dislike',
    'asset_comment',
    'get_asset_comment',
    'get_asset_comment_reply',
    'comment',
    'get_comment',
    'submit_assignment',
    'discussion_topic',
    'discussion_entry',
    'get_discussion_entry_reply',
    'export_whiteboard',
    'view_asset',
    'whiteboard_add_asset',
    'whiteboard_chat',
    'get_view_asset',
    'get_whiteboard_add_asset',
    'remix_whiteboard',
    'get_remix_whiteboard'
);


ALTER TYPE enum_activity_types_type OWNER TO suitec;

--
-- Name: enum_assets_type; Type: TYPE; Schema: public; Owner: suitec
--

CREATE TYPE enum_assets_type AS ENUM (
    'file',
    'link',
    'whiteboard',
    'thought'
);


ALTER TYPE enum_assets_type OWNER TO suitec;

--
-- Name: enum_users_canvas_enrollment_state; Type: TYPE; Schema: public; Owner: suitec
--

CREATE TYPE enum_users_canvas_enrollment_state AS ENUM (
    'active',
    'completed',
    'inactive',
    'invited',
    'rejected'
);


ALTER TYPE enum_users_canvas_enrollment_state OWNER TO suitec;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: suitec
--

CREATE FUNCTION update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO suitec;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE activities (
    id integer NOT NULL,
    type enum_activities_type NOT NULL,
    object_id integer,
    object_type enum_activities_object_type NOT NULL,
    metadata json,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    asset_id integer,
    course_id integer NOT NULL,
    user_id integer NOT NULL,
    actor_id integer,
    reciprocal_id integer
);


ALTER TABLE activities OWNER TO suitec;

--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE activities_id_seq OWNER TO suitec;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE activities_id_seq OWNED BY activities.id;


--
-- Name: activity_types; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE activity_types (
    id integer NOT NULL,
    type enum_activity_types_type NOT NULL,
    points integer,
    enabled boolean DEFAULT true,
    course_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE activity_types OWNER TO suitec;

--
-- Name: activity_types_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE activity_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE activity_types_id_seq OWNER TO suitec;

--
-- Name: activity_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE activity_types_id_seq OWNED BY activity_types.id;


--
-- Name: asset_users; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE asset_users (
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    asset_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE asset_users OWNER TO suitec;

--
-- Name: asset_whiteboard_elements; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE asset_whiteboard_elements (
    uid text NOT NULL,
    element json NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    asset_id integer NOT NULL,
    element_asset_id integer
);


ALTER TABLE asset_whiteboard_elements OWNER TO suitec;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE assets (
    id integer NOT NULL,
    type enum_assets_type NOT NULL,
    url character varying(255),
    aws_s3_object_key character varying(255),
    download_url character varying(255),
    title character varying(255),
    canvas_assignment_id integer,
    description text,
    preview_status character varying(255) DEFAULT 'pending'::character varying,
    thumbnail_url character varying(255),
    image_url character varying(255),
    pdf_url character varying(255),
    preview_metadata json DEFAULT '"{}"'::json,
    mime character varying(255),
    source character varying(255),
    body text,
    likes integer DEFAULT 0,
    dislikes integer DEFAULT 0,
    views integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    course_id integer NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    impact_percentile integer DEFAULT 0 NOT NULL,
    impact_score integer DEFAULT 0 NOT NULL,
    trending_percentile integer DEFAULT 0 NOT NULL,
    trending_score integer DEFAULT 0 NOT NULL
);


ALTER TABLE assets OWNER TO suitec;

--
-- Name: assets_categories; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE assets_categories (
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    category_id integer NOT NULL,
    asset_id integer NOT NULL
);


ALTER TABLE assets_categories OWNER TO suitec;

--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE assets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE assets_id_seq OWNER TO suitec;

--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE assets_id_seq OWNED BY assets.id;


--
-- Name: canvas; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE canvas (
    canvas_api_domain character varying(255) NOT NULL,
    api_key character varying(255) NOT NULL,
    lti_key character varying(255) NOT NULL,
    lti_secret character varying(255) NOT NULL,
    use_https boolean DEFAULT true,
    name character varying(255),
    logo character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    supports_custom_messaging boolean DEFAULT false NOT NULL
);


ALTER TABLE canvas OWNER TO suitec;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE categories (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    canvas_assignment_id integer,
    canvas_assignment_name character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    course_id integer,
    deleted_at timestamp with time zone,
    visible boolean DEFAULT true NOT NULL
);


ALTER TABLE categories OWNER TO suitec;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE categories_id_seq OWNER TO suitec;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE categories_id_seq OWNED BY categories.id;


--
-- Name: chats; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE chats (
    id integer NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    whiteboard_id integer NOT NULL,
    user_id integer
);


ALTER TABLE chats OWNER TO suitec;

--
-- Name: chats_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE chats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE chats_id_seq OWNER TO suitec;

--
-- Name: chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE chats_id_seq OWNED BY chats.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE comments (
    id integer NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    asset_id integer NOT NULL,
    user_id integer,
    parent_id integer
);


ALTER TABLE comments OWNER TO suitec;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE comments_id_seq OWNER TO suitec;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE comments_id_seq OWNED BY comments.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE courses (
    id integer NOT NULL,
    canvas_course_id integer NOT NULL,
    enable_upload boolean DEFAULT true NOT NULL,
    name character varying(255),
    assetlibrary_url character varying(255),
    whiteboards_url character varying(255),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    canvas_api_domain character varying(255) NOT NULL,
    engagementindex_url character varying(255),
    enable_daily_notifications boolean DEFAULT true NOT NULL,
    enable_weekly_notifications boolean DEFAULT true NOT NULL,
    dashboard_url character varying(255)
);


ALTER TABLE courses OWNER TO suitec;

--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE courses_id_seq OWNER TO suitec;

--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE courses_id_seq OWNED BY courses.id;


--
-- Name: pinned_user_assets; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE pinned_user_assets (
    asset_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE pinned_user_assets OWNER TO suitec;

--
-- Name: users; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE users (
    id integer NOT NULL,
    canvas_user_id integer NOT NULL,
    canvas_course_role character varying(255) NOT NULL,
    canvas_enrollment_state enum_users_canvas_enrollment_state NOT NULL,
    canvas_full_name character varying(255) NOT NULL,
    canvas_image character varying(255),
    canvas_email character varying(255),
    points integer DEFAULT 0 NOT NULL,
    share_points boolean,
    last_activity timestamp with time zone,
    bookmarklet_token character varying(32) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    course_id integer NOT NULL,
    canvas_course_sections character varying(255)[],
    personal_bio character varying(255),
    looking_for_collaborators boolean DEFAULT false NOT NULL
);


ALTER TABLE users OWNER TO suitec;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_id_seq OWNER TO suitec;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: whiteboard_elements; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE whiteboard_elements (
    uid integer NOT NULL,
    element json NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    whiteboard_id integer NOT NULL,
    asset_id integer
);


ALTER TABLE whiteboard_elements OWNER TO suitec;

--
-- Name: whiteboard_members; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE whiteboard_members (
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_id integer NOT NULL,
    whiteboard_id integer NOT NULL
);


ALTER TABLE whiteboard_members OWNER TO suitec;

--
-- Name: whiteboard_sessions; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE whiteboard_sessions (
    socket_id character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    whiteboard_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE whiteboard_sessions OWNER TO suitec;

--
-- Name: whiteboards; Type: TABLE; Schema: public; Owner: suitec
--

CREATE TABLE whiteboards (
    id integer NOT NULL,
    title character varying(255),
    thumbnail_url character varying(255),
    aws_s3_object_key character varying(255),
    image_url character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    course_id integer NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE whiteboards OWNER TO suitec;

--
-- Name: whiteboards_id_seq; Type: SEQUENCE; Schema: public; Owner: suitec
--

CREATE SEQUENCE whiteboards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE whiteboards_id_seq OWNER TO suitec;

--
-- Name: whiteboards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suitec
--

ALTER SEQUENCE whiteboards_id_seq OWNED BY whiteboards.id;


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activities ALTER COLUMN id SET DEFAULT nextval('activities_id_seq'::regclass);


--
-- Name: activity_types id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activity_types ALTER COLUMN id SET DEFAULT nextval('activity_types_id_seq'::regclass);


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY assets ALTER COLUMN id SET DEFAULT nextval('assets_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY categories ALTER COLUMN id SET DEFAULT nextval('categories_id_seq'::regclass);


--
-- Name: chats id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY chats ALTER COLUMN id SET DEFAULT nextval('chats_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY comments ALTER COLUMN id SET DEFAULT nextval('comments_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY courses ALTER COLUMN id SET DEFAULT nextval('courses_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Name: whiteboards id; Type: DEFAULT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboards ALTER COLUMN id SET DEFAULT nextval('whiteboards_id_seq'::regclass);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_types activity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activity_types
    ADD CONSTRAINT activity_types_pkey PRIMARY KEY (id, course_id);


--
-- Name: asset_users asset_users_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY asset_users
    ADD CONSTRAINT asset_users_pkey PRIMARY KEY (asset_id, user_id);


--
-- Name: asset_whiteboard_elements asset_whiteboard_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY asset_whiteboard_elements
    ADD CONSTRAINT asset_whiteboard_elements_pkey PRIMARY KEY (uid, asset_id);


--
-- Name: assets_categories assets_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY assets_categories
    ADD CONSTRAINT assets_categories_pkey PRIMARY KEY (category_id, asset_id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: canvas canvas_lti_key_key; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY canvas
    ADD CONSTRAINT canvas_lti_key_key UNIQUE (lti_key);


--
-- Name: canvas canvas_lti_secret_key; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY canvas
    ADD CONSTRAINT canvas_lti_secret_key UNIQUE (lti_secret);


--
-- Name: canvas canvas_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY canvas
    ADD CONSTRAINT canvas_pkey PRIMARY KEY (canvas_api_domain);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: pinned_user_assets pinned_user_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY pinned_user_assets
    ADD CONSTRAINT pinned_user_assets_pkey PRIMARY KEY (asset_id, user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whiteboard_elements whiteboard_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_elements
    ADD CONSTRAINT whiteboard_elements_pkey PRIMARY KEY (uid, whiteboard_id);


--
-- Name: whiteboard_members whiteboard_members_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_members
    ADD CONSTRAINT whiteboard_members_pkey PRIMARY KEY (user_id, whiteboard_id);


--
-- Name: whiteboard_sessions whiteboard_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_sessions
    ADD CONSTRAINT whiteboard_sessions_pkey PRIMARY KEY (socket_id);


--
-- Name: whiteboards whiteboards_pkey; Type: CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboards
    ADD CONSTRAINT whiteboards_pkey PRIMARY KEY (id);


--
-- Name: activities_actor_id_idx; Type: INDEX; Schema: public; Owner: suitec
--

CREATE INDEX activities_actor_id_idx ON activities USING btree (actor_id);


--
-- Name: activities_asset_id_idx; Type: INDEX; Schema: public; Owner: suitec
--

CREATE INDEX activities_asset_id_idx ON activities USING btree (asset_id);


--
-- Name: activities_created_at_idx; Type: INDEX; Schema: public; Owner: suitec
--

CREATE INDEX activities_created_at_idx ON activities USING btree (created_at);


--
-- Name: activity_types_type_course_id; Type: INDEX; Schema: public; Owner: suitec
--

CREATE UNIQUE INDEX activity_types_type_course_id ON activity_types USING btree (type, course_id);


--
-- Name: asset_users_asset_id_idx; Type: INDEX; Schema: public; Owner: suitec
--

CREATE INDEX asset_users_asset_id_idx ON asset_users USING btree (asset_id);


--
-- Name: canvas update_canvas_updated_at; Type: TRIGGER; Schema: public; Owner: suitec
--

CREATE TRIGGER update_canvas_updated_at BEFORE UPDATE ON canvas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


--
-- Name: activities activities_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activities_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: activities activities_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activities_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activities activities_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activities_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activities activities_reciprocal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activities_reciprocal_id_fkey FOREIGN KEY (reciprocal_id) REFERENCES activities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activity_types activity_types_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY activity_types
    ADD CONSTRAINT activity_types_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_users asset_users_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY asset_users
    ADD CONSTRAINT asset_users_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_users asset_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY asset_users
    ADD CONSTRAINT asset_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_whiteboard_elements asset_whiteboard_elements_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY asset_whiteboard_elements
    ADD CONSTRAINT asset_whiteboard_elements_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: asset_whiteboard_elements asset_whiteboard_elements_element_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY asset_whiteboard_elements
    ADD CONSTRAINT asset_whiteboard_elements_element_asset_id_fkey FOREIGN KEY (element_asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets_categories assets_categories_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY assets_categories
    ADD CONSTRAINT assets_categories_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets_categories assets_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY assets_categories
    ADD CONSTRAINT assets_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets assets_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY assets
    ADD CONSTRAINT assets_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: categories categories_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY categories
    ADD CONSTRAINT categories_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chats chats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY chats
    ADD CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chats chats_whiteboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY chats
    ADD CONSTRAINT chats_whiteboard_id_fkey FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: comments comments_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT comments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: comments comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES comments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: courses courses_canvas_api_domain_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY courses
    ADD CONSTRAINT courses_canvas_api_domain_fkey FOREIGN KEY (canvas_api_domain) REFERENCES canvas(canvas_api_domain) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pinned_user_assets pinned_user_assets_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY pinned_user_assets
    ADD CONSTRAINT pinned_user_assets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pinned_user_assets pinned_user_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY pinned_user_assets
    ADD CONSTRAINT pinned_user_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: whiteboard_elements whiteboard_elements_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_elements
    ADD CONSTRAINT whiteboard_elements_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: whiteboard_elements whiteboard_elements_whiteboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_elements
    ADD CONSTRAINT whiteboard_elements_whiteboard_id_fkey FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: whiteboard_members whiteboard_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_members
    ADD CONSTRAINT whiteboard_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: whiteboard_members whiteboard_members_whiteboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_members
    ADD CONSTRAINT whiteboard_members_whiteboard_id_fkey FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: whiteboard_sessions whiteboard_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_sessions
    ADD CONSTRAINT whiteboard_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: whiteboard_sessions whiteboard_sessions_whiteboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboard_sessions
    ADD CONSTRAINT whiteboard_sessions_whiteboard_id_fkey FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: whiteboards whiteboards_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suitec
--

ALTER TABLE ONLY whiteboards
    ADD CONSTRAINT whiteboards_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: public; Type: ACL; Schema: -; Owner: suitec
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM suitec;
GRANT ALL ON SCHEMA public TO suitec;


--
-- PostgreSQL database dump complete
--

