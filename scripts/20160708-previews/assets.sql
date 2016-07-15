-- Drop old embed logic in favour of simpler previewing service

alter table assets add pdf_url character varying(255);

alter table assets add preview_status character varying(255) ;
alter table assets alter preview_status set default 'pending';

alter table assets add preview_metadata json;
alter table assets alter preview_metadata set default '{}';

alter table assets drop embed_id;
alter table assets drop embed_key;
alter table assets drop embed_code;
