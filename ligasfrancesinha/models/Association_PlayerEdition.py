from ligasfrancesinha import model 
from ligasfrancesinha.sql_db import db
from sqlalchemy import Column, Integer, ForeignKey , Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from ligasfrancesinha.tools.input_tools import Field, Block , Form

class Association_PlayerEdition(db.Model ,model.Model, model.Base):
    __tablename__ = 'players_in_edition'
    __table_args__ = {'extend_existing': True}
    page_title = 'Relação de Jogador Edição'
    model_name = 'Association_PlayerEdition'

    id = Column(Integer, primary_key=True)

    player_id = Column(Integer, ForeignKey('players.id'))
    edition_id = Column(Integer, ForeignKey('editions.id'))

    place = Column(Integer)
    last_place = Column(Integer,default=0)
    points = Column(Float,default=0)
    appearances = Column(Integer,default=0)
    goals = Column(Integer,default=0)
    percentage_of_appearances = Column(Float,default=0)
    wins = Column(Integer,default=0)
    draws = Column(Integer,default=0)
    losts = Column(Integer,default=0)
    goals_scored_by_team = Column(Integer,default=0)
    goals_suffered_by_team = Column(Integer,default=0)
    matchweek = Column(Integer,default=0)

    player = relationship('Player', back_populates='editions_relations')
    edition = relationship('Edition', back_populates='players_relations')

    @hybrid_property
    def name(self):
        return f"{self.player} in {self.edition}"

    def __repr__(self):
        try:
            return f"{self.edition}: {self.player}"
        except:
            return f"Empty {self.model_name}"
    
    def __str__(self):
        try:
            return f"{self.edition}: {self.player}"
        except:
            return f"Empty {self.model_name}"

    def display_all_info(self):
        searchable_column = {'field': 'player','label':'Jogador'}
        table_columns = [
            {'field': 'edition','label':'Edição'},
            searchable_column,
        ]
        return searchable_column , table_columns

    def get_create_form(self):
        def get_field(name,label,type,required=False,related_model=None,options=None):
            return Field(instance_id=self.id,model=self.model_name,name=name,label=label,type=type,required=required,related_model=related_model,options=options)
        form = Form()

        # Create Info block
        fields = [
            get_field(name='player',label='Jogador',type='ManyToOne',related_model='Player'),
            get_field(name='edition',label='Edição',type='ManyToOne',related_model='Edition'),
            get_field(name='place',label='Lugar',type='Integer'),
        ]
        info_block = Block('info_block',fields)
        form.add_block(info_block)

        return form
