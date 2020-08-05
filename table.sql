create  table if not exists landscape(
	id serial not null,
	x int not null,
	y int not null,
	model varchar(20),
	_mode varchar(20) not null,
	connect varchar(30) not null
);

CREAtE OR REPLACE function  stack_check() returns TRIGGER AS $$
begin
    IF    TG_OP = 'INSERT' THEN
        IF new._mode like 'DeleteModel' then
            DELETE
            FROM landscape
            WHERE x = new.x
              and y = new.y
              and _mode like 'PlaceModel'
              and model like new.model
                and id = (select max(id) as max_id
              from landscape
                  where x =new.x
                    and y = new.y
                    and _mode like 'PlaceModel'
                    and model like new.model
                        group by id );
        end if;
    end if;
    return new;
end;
$$ LANGUAGE 'plpgsql';
create  trigger OnInsert after INSERT
    ON landscape
    FOR each STATEMENT
execute procedure stack_check();
