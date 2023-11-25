from ligasfrancesinha import model 
from ligasfrancesinha.sql_db import db
from sqlalchemy import Column, Integer, Float, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship

from ligasfrancesinha.tools.input_tools import Field, Block , Form

class KanbanTicket(model.Imageable, model.Model, model.Base):
    __tablename__ = 'kanban_tickets'
    __table_args__ = {'extend_existing': True}
    page_title = 'Tickets'
    model_name = 'KanbanTicket'
    
    id = Column(Integer, primary_key=True)

    imageable_id = Column(Integer, ForeignKey('imageables.imageable_id'))
    imageable = relationship('Imageable', backref=db.backref('products', uselist=False, cascade='all,delete-orphan'),post_update=True)

    title = Column(Text)

    context = Column(Text)
    description = Column(Text)
    priority = Column(Enum('Very Low','Low','Medium','High','Very High',name='priority'), primary_key=True)
    estimated_time = Column(Float)
    
    reporter_id = Column(Integer, ForeignKey('users.id'))
    responsible_id = Column(Integer, ForeignKey('users.id'))

    reporter = relationship('User', back_populates="tickets_reported", foreign_keys=[reporter_id])
    responsible = relationship('User', back_populates="tickets_under_responsibility", foreign_keys=[responsible_id])

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
        ]
        info_block = Block('info_block',fields)
        form.add_block(info_block)

        return form