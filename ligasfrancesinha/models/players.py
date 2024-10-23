from datetime import date
from email.policy import default

from ligasfrancesinha import model 
from ligasfrancesinha.sql_db import db
from sqlalchemy import Column, Integer , String , Text, ForeignKey, Table , Date
from sqlalchemy.orm import relationship
from flask import url_for

from ligasfrancesinha.tools.input_tools import Field, Block , Form

class Player(db.Model ,model.Model, model.Base):
    __tablename__ = 'players'
    __table_args__ = {'extend_existing': True}
    page_title = 'Jogadores'
    model_name = 'Player'

    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    full_name =  Column(Text, unique=True)
    birthday = Column(Date)
    image_url = Column(Text,default= "Players/default_player.png")

    user = relationship("User",back_populates='player')
    games_relations = relationship('Association_PlayerGame', back_populates='player')
    editions_relations = relationship('Association_PlayerEdition', back_populates='player', cascade="all, delete-orphan")

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
        fields = [get_field(name='image_url',label='Fotografia',type='EditablePicture')]
        picture_block = Block('picture_block',fields)
        form.add_block(picture_block)

        # Create Info block
        fields = [
            get_field(name='name',label='Nome',type='Text',required=True),
            get_field(name='full_name',label='Nome Completo',type='Text',required=False),
            get_field(name='birthday',label='Data de nascimento',type='Date',required=False),
            get_field(name='user',label='Utilizador',type='OneToMany',related_model='User'),
            get_field(name='games_relations',label='Jogos (Relações)',type='OneToMany',related_model='Association_PlayerGame'),
            get_field(name='editions_relations',label='Edições (Relações)',type='OneToMany',related_model='Association_PlayerGame'),
        ]
        info_block = Block('info_block',fields)
        form.add_block(info_block)

        return form

    def editions(self):
        return [rel.edition for rel in self.editions_relations] 

    def games_played(self):
        #[rel.game for rel in self.games_relations if rel.game.played]
        return [rel.game for rel in self.games_relations] 
    
    def games_played_on_edition(self,edition):
        #[rel.game for rel in self.games_relations if rel.game.edition_id == edition.id and rel.game.played]
        return [rel.game for rel in self.games_relations if rel.game.edition_id == edition.id]

    def result_on_game(self,game):
        association = [rel for rel in self.games_relations if rel.game == game][0]
        factor = 1
        if association.team == 'Maregões':
            factor = -1
        return game.winner * factor

    def goals_on_game(self,game):
        association = [rel for rel in self.games_relations if rel.game == game][0]
        return association.goals

    def age(self):
        if self.birthday:
            today = date.today()
            return today.year - self.birthday.year - ((today.month, today.day) < (self.birthday.month, self.birthday.day))
        return None

    def full_image_url(self):
        return url_for('static', filename=f"images/{self.image_url}")

    def get_games_relations_played(self,edition = None):
        relations = self.games_relations
        if edition:
            relations = [relation for relation in self.games_relations if relation.game.edition==edition]
        #[relation for relation in relations if relation.game.played]
        return relations

    def goals_scored_by_team(self,edition=None):
        relations = self.get_games_relations_played(edition)
        goals_scored_by_team = [relation.game.goals_team1 if relation.team=='Branquelas' else relation.game.goals_team2 for relation in relations]
        return sum(goals_scored_by_team)

    def goals_suffered_by_team(self,edition=None):
        relations = self.get_games_relations_played(edition)
        goals_suffered_by_team = [relation.game.goals_team1 if relation.team=='Maregões' else relation.game.goals_team2 for relation in relations]
        return sum(goals_suffered_by_team)

    def games_won(self, edition=None):
        relations = self.get_games_relations_played(edition)
        return [rel.game for rel in relations if rel.team=='Branquelas' and rel.game.winner==1 or rel.team=='Maregões' and rel.game.winner==-1 ]

    def games_drawn(self, edition=None):
        relations = self.get_games_relations_played(edition)
        return [rel.game for rel in relations if rel.game.winner==0]

    def games_lost(self, edition=None):
        relations = self.get_games_relations_played(edition)
        return [rel.game for rel in relations if rel.team=='Maregões' and rel.game.winner==1 or rel.team=='Branquelas' and rel.game.winner==-1 ]

    def get_all_results(self, edition=None):
        relations = self.get_games_relations_played(edition)
        won = [rel.game for rel in relations if rel.team=='Branquelas' and rel.game.winner==1 or rel.team=='Maregões' and rel.game.winner==-1 ]
        drawn = [rel.game for rel in relations if rel.game.winner==0]
        lost = [rel.game for rel in relations if rel.team=='Maregões' and rel.game.winner==1 or rel.team=='Branquelas' and rel.game.winner==-1 ]
        return won, drawn , lost

    def goals(self, edition=None):
        relations = self.get_games_relations_played(edition)
        goals = [rel.goals for rel in relations]
        return sum(goals)

    def win_percentage(self,edition=None):
        return len(self.games_won(edition)) /len(self.get_games_relations_played(edition)) if len(self.get_games_relations_played(edition)) != 0 else 0