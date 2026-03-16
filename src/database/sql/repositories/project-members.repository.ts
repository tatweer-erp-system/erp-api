import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '@/database/sql/entities/project-member.entity';
import { ProjectMemberRole } from '@/common/enums/project.enums';

@Injectable()
export class ProjectMembersRepository {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly repo: Repository<ProjectMember>,
  ) {}

  async findByProject(tenantId: string, projectId: string): Promise<ProjectMember[]> {
    return this.repo.find({ where: { projectId } });
  }

  async findOne(
    tenantId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null> {
    return this.repo.findOne({ where: { projectId, userId } });
  }

  async insert(
    tenantId: string,
    data: {
      projectId: string;
      userId: string;
      role: string;
      createdBy?: string | null;
    },
  ): Promise<ProjectMember> {
    const entity = this.repo.create({
      projectId: data.projectId,
      userId: data.userId,
      role: (data.role as ProjectMemberRole) ?? ProjectMemberRole.DEVELOPER,
      createdBy: data.createdBy ?? null,
    });
    return this.repo.save(entity);
  }

  async updateRole(
    tenantId: string,
    projectId: string,
    userId: string,
    role: string,
    updatedBy?: string | null,
  ): Promise<void> {
    await this.repo.update({ projectId, userId }, { role: role as ProjectMemberRole });
  }

  async remove(tenantId: string, projectId: string, userId: string): Promise<void> {
    await this.repo.delete({ projectId, userId });
  }

  async countByRole(tenantId: string, projectId: string, role: ProjectMemberRole): Promise<number> {
    return this.repo.count({ where: { projectId, role } });
  }

  async findAssignableUsers(tenantId: string): Promise<{ userId: string }[]> {
    const rows = await this.repo
      .createQueryBuilder('pm')
      .select('DISTINCT pm.user_id', 'userId')
      .getRawMany();
    return rows as { userId: string }[];
  }
}
