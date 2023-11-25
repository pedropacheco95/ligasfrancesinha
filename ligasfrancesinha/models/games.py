from ligasfrancesinha import model 
from ligasfrancesinha.sql_db import db
from sqlalchemy import Boolean, Column, Integer , String , Text, ForeignKey , Date
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from ligasfrancesinha.tools.input_tools import Field, Block , Form

class Game(db.Model ,model.Model, model.Base):
    __tablename__ = 'games'
    __table_args__ = {'extend_existing': True}
    page_title = 'Jogos'
    model_name = 'Game'

    id = Column(Integer, primary_key=True)
    goals_team1 = Column(Integer, default=0)
    goals_team2 = Column(Integer, default=0)
    date = Column(Date)
    winner = Column(Integer, default=0)
    matchweek = Column(Integer, nullable=False)
    played = Column(Boolean,default=False)
    edition_id =  Column(Integer, ForeignKey('editions.id'))

    edition = relationship("Edition",back_populates='games')
    players_relations = relationship('Association_PlayerGame', back_populates="game", cascade="all, delete-orphan")

    @hybrid_property
    def name(self):
        return f"{self.edition.name}, jornada {self.matchweek}"

    def display_all_info(self):
        searchable_column = {'field': 'date','label':'Data'}
        table_columns = [
            {'field': 'id','label':'Numero'},
            searchable_column,
            {'field': 'goals_team1','label':'Golos Equipa 1'},
            {'field': 'goals_team2','label':'Golos Equipa 2'},
            {'field': 'matchweek','label':'Jornada'},
        ]
        return searchable_column , table_columns

    def get_create_form(self):
        def get_field(name,label,type,required=False,related_model=None):
            return Field(instance_id=self.id,model=self.model_name,name=name,label=label,type=type,required=required,related_model=related_model)
        form = Form()

        # Create Info block
        fields = [
            get_field(name='goals_team1',label='Golos Equipa 1',type='Integer',required=False),
            get_field(name='goals_team2',label='Golos Equipa 2',type='Integer',required=False),
            get_field(name='date',label='Data', type='Date',required=False),
            get_field(name='winner',label='Vencedor (-1,0,1)',type='Integer',required=False),
            get_field(name='matchweek',label='Jornada',type='Integer',required=False),
            get_field(name='played',label='Já foi jogado?',type='Boolean',required=False),
            get_field(name='edition',label='Edição',type='ManyToOne',related_model='Edition'),
            get_field(name='players_relations',label='Jogadores (Relações)',type='OneToMany',related_model='Association_PlayerGame'),
        ]
        info_block = Block('info_block',fields)
        form.add_block(info_block)

        return form

    def players_by_team(self):
        teams = {}
        teams['Branquelas'] = []
        teams['Maregões'] = []
        for association in self.players_relations:
            teams[association.team].append((association,association.player))

        return teams
