import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '@/database/sql/entities/project.entity';
import { ProjectMember } from '@/database/sql/entities/project-member.entity';
import { Task } from '@/database/sql/entities/task.entity';
import { TaskTimeEntry } from '@/database/sql/entities/task-time-entry.entity';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';
import { TasksController, ProjectTasksController } from './controllers/tasks.controller';
import { TasksService } from './services/tasks.service';
import { ProjectsRepository } from '@/database/sql/repositories/projects.repository';
import { ProjectMembersRepository } from '@/database/sql/repositories/project-members.repository';
import { TasksRepository } from '@/database/sql/repositories/tasks.repository';
import { TaskTimeEntriesRepository } from '@/database/sql/repositories/task-time-entries.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember, Task, TaskTimeEntry])],
  controllers: [ProjectsController, TasksController, ProjectTasksController],
  providers: [
    ProjectsService,
    TasksService,
    ProjectsRepository,
    ProjectMembersRepository,
    TasksRepository,
    TaskTimeEntriesRepository,
  ],
  exports: [ProjectsRepository, TasksRepository],
})
export class ProjectsModule {}
