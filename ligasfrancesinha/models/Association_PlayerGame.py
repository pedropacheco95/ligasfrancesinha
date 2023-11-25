from ligasfrancesinha import model 
from ligasfrancesinha.sql_db import db
from sqlalchemy import Column, Integer, ForeignKey , Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from ligasfrancesinha.tools.input_tools import Field, Block , Form

from . import Player , Game

class Association_PlayerGame(db.Model ,model.Model, model.Base):
    __tablename__ = 'players_in_game'
    __table_args__ = {'extend_existing': True}
    page_title = 'Relação de Jogador Jogo'
    model_name = 'Association_PlayerGame'

    id = Column(Integer, primary_key=True)

    player_id = Column(Integer, ForeignKey('players.id'))
    game_id = Column(Integer, ForeignKey('games.id'))

    team = Column(Enum('Branquelas','Maregões',name='teams'))
    goals =  Column(Integer)

    game = relationship('Game', back_populates='players_relations')
    player = relationship('Player', back_populates='games_relations')

    @hybrid_property
    def name(self):
        return f"{self.player} in {self.game}"

    def __repr__(self):
        try:
            return f"{self.game}: {self.player}"
        except:
            return f"Empty {self.model_name}"
    
    def __str__(self):
        try:
            return f"{self.game}: {self.player}"
        except:
            return f"Empty {self.model_name}"


    def display_all_info(self):
        searchable_column = {'field': 'player','label':'Jogador'}
        table_columns = [
            {'field': 'game','label':'Jogo'},
            searchable_column,
            {'field': 'team','label':'Equipa'},
            {'field': 'goals','label':'Golos'},
        ]
        return searchable_column , table_columns

    def get_create_form(self):
        def get_field(name,label,type,required=False,related_model=None,options=None):
            return Field(instance_id=self.id,model=self.model_name,name=name,label=label,type=type,required=required,related_model=related_model,options=options)
        form = Form()

        # Create Info block
        fields = [
            get_field(name='game',label='Jogos',type='ManyToOne',related_model='Game'),
            get_field(name='player',label='Jogador',type='ManyToOne',related_model='Player'),
            get_field(name='team',label='Equipa',type='Select',options=['Branquelas','Maregões']),
            get_field(name='goals',label='Golos',type='Integer'),
        ]
        info_block = Block('info_block',fields)
        form.add_block(info_block)

        return form

    def get_game(self):
        return self.game

    def get_player(self):
        return self.player