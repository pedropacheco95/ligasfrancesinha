from ligasfrancesinha import model 
from ligasfrancesinha.sql_db import db
from sqlalchemy import Column, Integer , String , Text , Boolean, ForeignKey
from sqlalchemy.orm import relationship

from ligasfrancesinha.tools.input_tools import Field, Block , Form

from flask_login import UserMixin

class User(db.Model, UserMixin, model.Model, model.Base):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    page_title = 'Utilizadores'
    model_name = 'User'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(80))
    username = Column(String(80), unique=True, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_responsible = Column(Boolean, default=False)
    email = Column(String(120), unique=True, nullable=False)
    password = Column(Text, nullable=False)
    generated_code = Column(Integer)
    player_id = Column(Integer, ForeignKey('players.id'))

    player = relationship("Player",back_populates='user', foreign_keys=[player_id], uselist=False)
    tickets_reported = relationship('KanbanTicket', back_populates="reporter", foreign_keys='KanbanTicket.reporter_id')
    tickets_under_responsibility = relationship('KanbanTicket', back_populates="responsible", foreign_keys='KanbanTicket.responsible_id')

    def display_all_info(self):
        searchable_column = {'field': 'name','label':'Nome'}
        table_columns = [
            {'field': 'id','label':'Numero'},
            searchable_column,
            {'field': 'username','label':'Username'},
            {'field': 'email','label':'Email'},
        ]
        return searchable_column , table_columns

    def get_create_form(self):
        def get_field(name,label,type,required=False,related_model=None):
            return Field(instance_id=self.id,model=self.model_name,name=name,label=label,type=type,required=required,related_model=related_model)
        form = Form()
        # Create Info block

        fields = [
            get_field(name='name',label='Nome',type='Text',required=True),
            get_field(name='username',label='Username',type='Text',required=True),
            get_field(name='email',label='Email',type='Text',required=True),
            get_field(name='password',label='Password',type='Password',required=True),
            get_field(name='is_admin',label='Administrador',type='Boolean',required=False),
            get_field(name='is_responsible',label='Administrador',type='Boolean',required=False),
        ]
        info_block = Block('info_block',fields)
        form.add_block(info_block)

        return form