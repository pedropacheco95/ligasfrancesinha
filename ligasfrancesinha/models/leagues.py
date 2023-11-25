from ligasfrancesinha import model 
from ligasfrancesinha.sql_db import db
from sqlalchemy import Column, Integer , String , Text, ForeignKey
from sqlalchemy.orm import relationship
from flask import url_for

from ligasfrancesinha.tools.input_tools import Field, Block , Form

class League(db.Model ,model.Model, model.Base):
    __tablename__ = 'leagues'
    __table_args__ = {'extend_existing': True}
    page_title = 'Ligas'
    model_name = 'League'

    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    picture = Column(Text)

    editions = relationship('Edition', back_populates='league', cascade="all, delete-orphan")


    def display_all_info(self):
        searchable_column = {'field': 'name','label':'Nome'}
        table_columns = [
            {'field': 'id','label':'Numero'},
            searchable_column,
        ]
        return searchable_column , table_columns

    def get_create_form(self):
        def get_field(name,label,type,required=False,related_model=None):
            return Field(instance_id=self.id,model=self.model_name,name=name,label=label,type=type,required=required,related_model=related_model)
        form = Form()
        # Create Picture block
        fields = [get_field(name='picture',label='Fotografia',type='EditablePicture')]
        picture_block = Block('picture_block',fields)
        form.add_block(picture_block)

        # Create Info block
        fields = [
            get_field(name='name',label='Nome',type='Text',required=True),
            get_field(name='editions',label='Edições',type='OneToMany',related_model='Edition'),
        ]
        info_block = Block('info_block',fields)
        form.add_block(info_block)

        return form

    def full_image_url(self):
        return url_for('static', filename=f"images/{self.picture}")
